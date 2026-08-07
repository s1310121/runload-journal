import { AUTHORITY_VERSION, PARAMETER_SET_VERSION, ADAPTER_VERSION, REGIONS } from "./data.js";
import { isStandardShoeCandidate } from "./presets.js";
import { failure, success } from "./utils.js";
import { validateFormalInputBundle } from "./adapter.js";
import { JOINT_GRADE_SOURCE, CADENCE_JOINT_WORK_SOURCE, FIGURE_DIGITIZED_SPEED_SOURCE, WILLER_2024_TABULATED_SPEED_WORK_SOURCE } from "./a3-sources.js";
import { HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE } from "./a4-sources.js";

const value=(bundle,id)=>bundle.formalInputs[id]?.status==="KNOWN"?bundle.formalInputs[id].value:null;
const SOURCE_SURFACES=new Set(["Asphalt","Concrete","Grass","Rubber"]);
const SOURCE_SURFACE_EVIDENCE=new Set(["EXPLICIT_SUBTYPE","MATERIAL_SPECIFIC_PRESET"]);
const PROFILE_GRADES=[-15,-10,-5,0,5,10,15];
const PROFILE_SPEEDS=[3.75,3.583333333333,3.416666666667,3.055555555556,2.277777777778,1.805555555556,1.5];
function signedSectionGrade(section){
  if(section.gradeDirection==="UPHILL")return section.gradePercent;
  if(section.gradeDirection==="DOWNHILL")return -section.gradePercent;
  if(section.gradeDirection==="FLAT")return 0;
  return null;
}
function profileSpeedAtGrade(grade){
  if(!Number.isFinite(grade)||grade<PROFILE_GRADES[0]||grade>PROFILE_GRADES.at(-1))return null;
  const exact=PROFILE_GRADES.findIndex(value=>Math.abs(value-grade)<=1e-12);
  if(exact>=0)return PROFILE_SPEEDS[exact];
  for(let index=0;index<PROFILE_GRADES.length-1;index+=1){
    if(grade>=PROFILE_GRADES[index]&&grade<=PROFILE_GRADES[index+1]){
      const t=(grade-PROFILE_GRADES[index])/(PROFILE_GRADES[index+1]-PROFILE_GRADES[index]);
      return PROFILE_SPEEDS[index]+(PROFILE_SPEEDS[index+1]-PROFILE_SPEEDS[index])*t;
    }
  }
  return null;
}
function sectionPassesGradeSpeedProfile(section){
  const expected=profileSpeedAtGrade(signedSectionGrade(section));
  return expected!=null&&Number.isFinite(section.speedMps)&&Math.abs(section.speedMps-expected)<=0.15;
}
function sectionPassesA3JointGrade(section,runSetting){
  const grade=signedSectionGrade(section);
  return runSetting===JOINT_GRADE_SOURCE.runSetting
    &&Number.isFinite(grade)&&Math.abs(grade)>1e-9&&Math.abs(grade)<=10.01
    &&Number.isFinite(section.speedMps)
    &&Math.abs(section.speedMps-JOINT_GRADE_SOURCE.speedMps)<=JOINT_GRADE_SOURCE.speedMps*JOINT_GRADE_SOURCE.speedToleranceFraction+1e-12;
}
function sectionPassesA3Cadence(section,runSetting){
  const grade=signedSectionGrade(section);
  const [vmin,vmax]=CADENCE_JOINT_WORK_SOURCE.speedDomainMps;
  return runSetting===CADENCE_JOINT_WORK_SOURCE.runSetting
    &&Math.abs(grade??Infinity)<=1e-9
    &&Number.isFinite(section.speedMps)&&section.speedMps>=vmin&&section.speedMps<=vmax
    &&Number.isFinite(section.cadenceSpm)
    &&section.cadenceSpm>=CADENCE_JOINT_WORK_SOURCE.cadenceSpm[0]
    &&section.cadenceSpm<=CADENCE_JOINT_WORK_SOURCE.cadenceSpm.at(-1)
    &&Math.abs(section.cadenceSpm-CADENCE_JOINT_WORK_SOURCE.referenceCadenceSpm)>=2;
}
function sectionPassesWillerSpeedWork(section,runSetting){
  const source=WILLER_2024_TABULATED_SPEED_WORK_SOURCE;
  const grade=signedSectionGrade(section);
  if(!(runSetting===source.runSetting&&Math.abs(grade??Infinity)<=1e-9&&Number.isFinite(section.speedMps)&&Number.isFinite(section.cadenceSpm)))return false;
  const speed=section.speedMps;
  if(speed<source.speedMps[0]||speed>source.speedMps.at(-1))return false;
  const xs=source.speedMps,ys=source.sourceCadenceSpm;
  let expected=null;
  for(let index=0;index<xs.length-1;index+=1){if(speed>=xs[index]&&speed<=xs[index+1]){const t=(speed-xs[index])/(xs[index+1]-xs[index]);expected=ys[index]+(ys[index+1]-ys[index])*t;break;}}
  if(expected==null&&Math.abs(speed-xs.at(-1))<=1e-12)expected=ys.at(-1);
  return expected!=null&&Math.abs(section.cadenceSpm-expected)<=expected*source.cadenceToleranceFraction;
}
function sectionPassesA3FigureSpeed(section,runSetting){
  const grade=signedSectionGrade(section);
  if(!(runSetting===FIGURE_DIGITIZED_SPEED_SOURCE.runSetting&&Math.abs(grade??Infinity)<=1e-9&&Number.isFinite(section.speedMps)&&Number.isFinite(section.cadenceSpm)))return false;
  const speed=section.speedMps;
  if(speed<FIGURE_DIGITIZED_SPEED_SOURCE.speedMps[0]||speed>FIGURE_DIGITIZED_SPEED_SOURCE.speedMps.at(-1))return false;
  const xs=FIGURE_DIGITIZED_SPEED_SOURCE.speedMps, ys=FIGURE_DIGITIZED_SPEED_SOURCE.sourceCadenceSpm;
  let expected=null;
  for(let index=0;index<xs.length-1;index+=1){if(speed>=xs[index]&&speed<=xs[index+1]){const t=(speed-xs[index])/(xs[index+1]-xs[index]);expected=ys[index]+(ys[index+1]-ys[index])*t;break;}}
  if(expected==null&&Math.abs(speed-xs.at(-1))<=1e-12)expected=ys.at(-1);
  return expected!=null&&Math.abs(section.cadenceSpm-expected)<=expected*FIGURE_DIGITIZED_SPEED_SOURCE.cadenceToleranceFraction;
}
function sectionPassesA4Horiguchi(section,runSetting,strike,shoeType,softness){
  const source=HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE;
  const grade=signedSectionGrade(section);
  const degrees=Number.isFinite(grade)?Math.atan(grade/100)*180/Math.PI:null;
  const continuous=section.runningFormat==="CONTINUOUS_RUN"||section.runningFormat==="RUN";
  return continuous
    &&runSetting===source.runSetting
    &&Number.isFinite(section.speedMps)
    &&Math.abs(section.speedMps-source.speedMps)<=source.speedMps*source.speedToleranceFraction+1e-12
    &&Number.isFinite(degrees)&&degrees>=source.gradeDegrees[0]-1e-12&&degrees<=source.gradeDegrees.at(-1)+1e-12
    &&source.validFootPlacements.includes(strike)
    &&shoeType===source.requiredShoeType&&softness===source.requiredShoeSoftness;
}

function sectionPassesBat009(section){
  const grade=signedSectionGrade(section);
  return Number.isFinite(grade)&&grade>=0&&grade<=7&&Number.isFinite(section.speedMps)&&section.speedMps>=3.9615&&section.speedMps<=4.3785;
}
function sectionUnevennessLevel(section){
  const components=section.surfaceComponents??[];
  let weighted=0,total=0;
  for(const component of components){
    const level=component.propertyProfile?.unevennessLevel;
    const weight=component.sharePercent??0;
    if(!Number.isFinite(level)||!Number.isFinite(weight))return null;
    weighted+=level*weight;
    total+=weight;
  }
  return total>0?weighted/total:null;
}
function sectionPassesBoundedUnevenness(section){
  const level=sectionUnevennessLevel(section);
  return level>1&&Number.isFinite(section.speedMps)&&section.speedMps>=1.955&&section.speedMps<=2.645;
}
function supportedSurfaceShare(section,categories=SOURCE_SURFACES){
  return (section.surfaceComponents??[]).reduce((sum,component)=>sum+(
    categories.has(component.exactSourceCategory)&&SOURCE_SURFACE_EVIDENCE.has(component.exactSourceEvidence)
      ? Number(component.sharePercent??0)
      : 0
  ),0);
}
function sectionHasAnyExactSurface(section){return supportedSurfaceShare(section)>0;}
function sectionHasFullExactSurface(section){
  const components=section.surfaceComponents??[];
  return components.length>0&&supportedSurfaceShare(section)>=99.99;
}
function sectionPassesExactSurfaceGate(section,strike,shoeType,softness){
  const speed=section.speedMps;
  return Number.isFinite(speed)&&speed>=3.1667&&speed<=3.5&&strike==="RFS"&&isStandardShoeCandidate(shoeType,softness)&&sectionHasAnyExactSurface(section);
}
function sectionPassesExactArchSurfaceGate(section,shoeType,softness){
  const speed=section.speedMps;
  return Number.isFinite(speed)&&speed>=1.6&&speed<=2.4
    &&isStandardShoeCandidate(shoeType,softness)
    &&supportedSurfaceShare(section,new Set(["Concrete","Rubber"]))>0;
}

export function buildRegionalEngineInput(bundle, context={}){
  const validation=validateFormalInputBundle(bundle); if(!validation.valid)return failure("SCHEMA_INVALID","formal_bundle.invalid","formalInputs",{issues:validation.issues});
  if(bundle.authorityVersion!==AUTHORITY_VERSION)return failure("AUTHORITY_VERSION_MISMATCH","authority.version_mismatch","authorityVersion");
  const derived=deriveRegionalEngineState(bundle);
  return success({schemaVersion:"runload-regional-engine-input-1.0",authorityVersion:AUTHORITY_VERSION,parameterSetVersion:PARAMETER_SET_VERSION,adapterVersion:ADAPTER_VERSION,engineBuildVersion:context.engineBuildVersion??"runload-regional-engine-1.0.0",recordSnapshot:bundle.recordSnapshot,formalInputs:bundle.formalInputs,...derived,calculationOptions:{includeDetailedTrace:context.includeDetailedTrace??true,internalPrecisionDigits:12}});
}

export function deriveRegionalEngineState(bundle){
  const activity=value(bundle,"RL-IN-003");
  const speed=value(bundle,"RL-DV-019"), pace=value(bundle,"RL-DV-020"), cadence=value(bundle,"RL-DV-021");
  const sections=value(bundle,"RL-IN-039")??[];
  const shoeType=value(bundle,"RL-IN-072"), softness=value(bundle,"RL-IN-073"), strike=value(bundle,"RL-IN-080"), runSetting=value(bundle,"RL-IN-018");
  const routes=[];

  const a4HoriguchiSections=sections.filter(section=>sectionPassesA4Horiguchi(section,runSetting,strike,shoeType,softness));
  routes.push({
    routeId:"A4_HORIGUCHI_PLANTAR_PEAK_PRESSURE",
    state:a4HoriguchiSections.length===sections.length&&sections.length?"ACTIVE":a4HoriguchiSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-027","BA-DISP-029"],
    metGates:a4HoriguchiSections.length?["continuous treadmill running","3.33 m/s ±5%","-6 to +6 degrees","RFS or FFS self-report","training shoe with normal softness proxy"]:[],
    unmetGates:a4HoriguchiSections.length===sections.length&&sections.length?[]:["all sections must share the same Horiguchi endpoint family and satisfy every source-protocol gate"],
    sourceIds:["RCM-ANCH-A4-001..011"],
    parameterIds:[],
  });
  const exactSurfaceSections=sections.filter(section=>sectionPassesExactSurfaceGate(section,strike,shoeType,softness));
  const exactSurfaceCandidateSections=sections.filter(section=>sectionHasAnyExactSurface(section));
  const fullExactSurfaceSections=exactSurfaceSections.filter(section=>sectionHasFullExactSurface(section));
  const surfaceState=exactSurfaceSections.length===sections.length&&fullExactSurfaceSections.length===sections.length&&sections.length
    ?"ACTIVE"
    :exactSurfaceSections.length
      ?"PARTIAL"
      :exactSurfaceCandidateSections.length
        ?"INACTIVE"
        :"NOT_APPLICABLE";
  routes.push({routeId:"SURFACE_X_STANDARD_SHOE",state:surfaceState,regionIds:["BA-DISP-027","BA-DISP-029"],metGates:exactSurfaceSections.length?["one or more supported named-surface portions","section speed domain","RFS","standard shoe"]:[],unmetGates:surfaceState==="ACTIVE"?[]:["one or more section/source portions remain outside the exact protocol"],sourceIds:["RCM-ANCH-046..053"],parameterIds:[]});
  const exactArchSurfaceSections=sections.filter(section=>sectionPassesExactArchSurfaceGate(section,shoeType,softness));
  const fullExactArchSurfaceSections=exactArchSurfaceSections.filter(section=>supportedSurfaceShare(section,new Set(["Concrete","Rubber"]))>=99.99);
  routes.push({
    routeId:"ARCH_SURFACE_X_HEELED_SHOE",
    state:exactArchSurfaceSections.length===sections.length&&fullExactArchSurfaceSections.length===sections.length&&sections.length?"ACTIVE":exactArchSurfaceSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-028"],
    metGates:exactArchSurfaceSections.length?["one or more Concrete/Rubber source-compatible portions","1.6–2.4 m/s source speed","training/normal heeled-shoe proxy"]:[],
    unmetGates:exactArchSurfaceSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A1-095..096"],
    parameterIds:[],
  });
  const a3JointGradeSections=sections.filter(section=>sectionPassesA3JointGrade(section,runSetting));
  routes.push({
    routeId:"A3_SRC_SUP_003_JOINT_GRADE",
    state:a3JointGradeSections.length===sections.length&&sections.length?"ACTIVE":a3JointGradeSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-014","BA-DISP-016","BA-DISP-024"],
    metGates:a3JointGradeSections.length?["treadmill setting","2.25 m/s ±5%","non-level grade within source knots"]:[],
    unmetGates:a3JointGradeSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A3-001..015"],
    parameterIds:[],
  });
  const a3CadenceSections=sections.filter(section=>sectionPassesA3Cadence(section,runSetting));
  routes.push({
    routeId:"A3_E04_GROUP_MEAN_CADENCE",
    state:a3CadenceSections.length===sections.length&&sections.length?"ACTIVE":a3CadenceSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-014","BA-DISP-016","BA-DISP-024"],
    metGates:a3CadenceSections.length?["treadmill setting","level grade","2.4–3.4 m/s","155.34–189.86 spm group-mean source protocol"]:[],
    unmetGates:a3CadenceSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A3-016..030"],
    parameterIds:["RCM-P-GLOBAL-CADREF"],
  });
  const willerSpeedSections=sections.filter(section=>sectionPassesWillerSpeedWork(section,runSetting));
  routes.push({
    routeId:"A5_WILLER_2024_TABULATED_SPEED_WORK",
    state:willerSpeedSections.length===sections.length&&sections.length?"ACTIVE":willerSpeedSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-014","BA-DISP-016","BA-DISP-018","BA-DISP-023"],
    metGates:willerSpeedSections.length?["level instrumented-treadmill source family","2.78–5.00 m/s","source-compatible natural cadence ±5%","Table 2 numeric work values"]:[],
    unmetGates:willerSpeedSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["SRC-A5-001"],
    parameterIds:[],
  });
  const a3FigureSpeedSections=sections.filter(section=>sectionPassesA3FigureSpeed(section,runSetting));
  routes.push({
    routeId:"A3_E02_FIGURE_DIGITIZED_SPEED",
    state:a3FigureSpeedSections.length===sections.length&&sections.length?"ACTIVE":a3FigureSpeedSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015","BA-DISP-023"],
    metGates:a3FigureSpeedSections.length?["treadmill setting","level grade","2–5 m/s","source-compatible natural cadence ±5%","figure-digitized low-confidence proxy"]:[],
    unmetGates:a3FigureSpeedSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A3-034..043"],
    parameterIds:[],
  });
  const bat009Sections=sections.filter(sectionPassesBat009);
  routes.push({
    routeId:"BAT_SRC_009_GRADE_EXACT",
    state:bat009Sections.length===sections.length&&sections.length?"ACTIVE":bat009Sections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015"],
    metGates:bat009Sections.length?["4.17 m/s compatible speed","0–7% uphill grade"]:[],
    unmetGates:bat009Sections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A1-040..042","RCM-ANCH-A1-057..059","RCM-ANCH-A3-031..033"],
    parameterIds:[],
  });
  const gradeSpeedSections=sections.filter(sectionPassesGradeSpeedProfile);
  routes.push({
    routeId:"BAT_SRC_019_GRADE_SPEED_PROFILE",
    state:gradeSpeedSections.length===sections.length&&sections.length?"ACTIVE":gradeSpeedSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015"],
    metGates:gradeSpeedSections.length?["source grade range","paired source-compatible speed ±0.15 m/s"]:[],
    unmetGates:gradeSpeedSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A1-060..094"],
    parameterIds:[],
  });
  const unevenSections=sections.filter(sectionPassesBoundedUnevenness);
  routes.push({
    routeId:"BOUNDED_UNEVENNESS_X_SPEED",
    state:unevenSections.length===sections.length&&sections.length?"ACTIVE":unevenSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-016","BA-DISP-018","BA-DISP-024"],
    metGates:unevenSections.length?["unevenness level > 1","source-compatible speed 1.955–2.645 m/s"]:[],
    unmetGates:unevenSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-043..045"],
    parameterIds:["RCM-P-A1-UNEVEN-MAP"],
  });
  routes.push({routeId:"ARCH_PFA_SOURCE",state:"UNAVAILABLE",regionIds:["BA-DISP-028"],metGates:[],unmetGates:["validated barefoot source-protocol prerequisites are not represented in the current app"],sourceIds:["RCM-ANCH-054..056"],parameterIds:[]});
  return {
    derivedConditions:{averageSpeedMps:speed,averagePaceMinPerKm:pace,averageCadenceSpm:cadence,cadenceEligibility:cadence==null?"INELIGIBLE":"ELIGIBLE",exposureConsistency:speed==null&&activity==="RUN"?"WARNING":"CONSISTENT"},
    courseSections:sections,
    routeEligibility:routes,
  };
}
