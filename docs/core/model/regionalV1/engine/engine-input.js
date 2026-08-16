import { AUTHORITY_VERSION, PARAMETER_SET_VERSION, ADAPTER_VERSION, REGIONS } from "./data.js";
import { isStandardShoeCandidate } from "./presets.js";
import { failure, success } from "./utils.js";
import { validateFormalInputBundle } from "./adapter.js";
import { JOINT_GRADE_SOURCE, CADENCE_JOINT_WORK_SOURCE, FIGURE_DIGITIZED_SPEED_SOURCE, WILLER_2024_TABULATED_SPEED_WORK_SOURCE, A6_BEGINNER_GRADE_TRANSFER_POLICY } from "./a3-sources.js";
import { HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE } from "./a4-sources.js";
import { HO_2010_HEEL_PEAK_PRESSURE_SOURCE } from "./a6-r2-sources.js";

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
  // R21: BAT-SRC-019 group-mean speeds are descriptive outputs of a
  // participant-specific 10-km-performance prescription, not fixed eligibility
  // knots. The app cannot reproduce that source prescription; numeric route off.
  void section;
  return false;
}

function sectionPassesA3JointGrade(section,runSetting){
  const grade=signedSectionGrade(section);
  return runSetting===JOINT_GRADE_SOURCE.runSetting
    &&Number.isFinite(grade)&&Math.abs(grade)>1e-9&&grade>=JOINT_GRADE_SOURCE.gradePercent[0]-1e-12&&grade<=JOINT_GRADE_SOURCE.gradePercent.at(-1)+1e-12
    &&Number.isFinite(section.speedMps)
    &&Math.abs(section.speedMps-JOINT_GRADE_SOURCE.speedMps)<=JOINT_GRADE_SOURCE.speedMatchEpsilonMps;
}
function sectionPassesA6StableSurface(section,runSetting){
  const policy=A6_BEGINNER_GRADE_TRANSFER_POLICY;
  if(!policy.allowedRunSettings.includes(runSetting))return false;
  if(runSetting==="TREADMILL")return true;
  const components=(section.surfaceComponents??[]).filter(component=>Number(component.sharePercent??0)>0);
  if(!components.length)return false;
  const req=policy.stableOutdoorRequirements;
  return components.every(component=>{
    const profile=component.propertyProfile??{};
    return Number.isFinite(Number(profile.unevennessLevel))&&Number(profile.unevennessLevel)<=req.maxUnevennessLevel
      &&Number.isFinite(Number(profile.sinkLevel))&&Number(profile.sinkLevel)<=req.maxSinkLevel
      &&Number.isFinite(Number(profile.stabilityLevel))&&Number(profile.stabilityLevel)>=req.minStabilityLevel;
  });
}
function sectionPassesA6GradeTransfer(section,runSetting){
  const grade=signedSectionGrade(section),policy=A6_BEGINNER_GRADE_TRANSFER_POLICY;
  return Number.isFinite(grade)&&Math.abs(grade)>1e-9&&Math.abs(grade)<=10.01
    &&Number.isFinite(section.speedMps)&&section.speedMps>=policy.speedDomainMps[0]&&section.speedMps<=policy.speedDomainMps[1]
    &&sectionPassesA6StableSurface(section,runSetting);
}
function sectionPassesA6LocalGradeSpeedEnvelope(section,runSetting){
  const grade=signedSectionGrade(section),speed=section.speedMps;
  if(!Number.isFinite(grade)||Math.abs(grade)<=1e-9||!Number.isFinite(speed)||!sectionPassesA6StableSurface(section,runSetting))return false;
  for(let index=0;index<PROFILE_GRADES.length-1;index+=1){
    if(grade>=PROFILE_GRADES[index]&&grade<=PROFILE_GRADES[index+1]){
      const vmin=Math.min(PROFILE_SPEEDS[index],PROFILE_SPEEDS[index+1]),vmax=Math.max(PROFILE_SPEEDS[index],PROFILE_SPEEDS[index+1]);
      return speed>=vmin&&speed<=vmax;
    }
  }
  return false;
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
  if(!(runSetting===source.runSetting&&Math.abs(grade??Infinity)<=1e-9&&Number.isFinite(section.speedMps)))return false;
  return section.speedMps>=source.speedMps[0]&&section.speedMps<=source.speedMps.at(-1);
}
function sectionPassesA3FigureSpeed(section,runSetting){
  const grade=signedSectionGrade(section);
  if(!(runSetting===FIGURE_DIGITIZED_SPEED_SOURCE.runSetting&&Math.abs(grade??Infinity)<=1e-9&&Number.isFinite(section.speedMps)))return false;
  return section.speedMps>=FIGURE_DIGITIZED_SPEED_SOURCE.speedMps[0]&&section.speedMps<=FIGURE_DIGITIZED_SPEED_SOURCE.speedMps.at(-1);
}
function sectionPassesA4Horiguchi(section,runSetting,strike,shoeType,softness){
  const source=HORIGUCHI_PLANTAR_PEAK_PRESSURE_SOURCE;
  const grade=signedSectionGrade(section);
  const degrees=Number.isFinite(grade)?Math.atan(grade/100)*180/Math.PI:null;
  const continuous=section.runningFormat==="CONTINUOUS_RUN"||section.runningFormat==="RUN";
  return continuous
    &&runSetting===source.runSetting
    &&Number.isFinite(section.speedMps)
    &&Math.abs(section.speedMps-source.speedMps)<=source.speedMatchEpsilonMps
    &&Number.isFinite(degrees)&&degrees>=source.gradeDegrees[0]-1e-12&&degrees<=source.gradeDegrees.at(-1)+1e-12
    &&source.validFootPlacements.includes(strike)
    &&shoeType===source.requiredShoeType&&softness===source.requiredShoeSoftness;
}

function sectionPassesA6Ho2010Heel(section,runSetting){
  const source=HO_2010_HEEL_PEAK_PRESSURE_SOURCE;
  if(runSetting!==source.runSetting)return false;
  if(!(section.runningFormat==="CONTINUOUS_RUN"||section.runningFormat==="RUN"))return false;
  const grade=signedSectionGrade(section), speed=section.speedMps;
  if(!Number.isFinite(grade)||!Number.isFinite(speed))return false;
  if(Math.abs(grade-source.levelSpeedPath.fixedGradePercent)<=1e-12){
    return speed>=source.levelSpeedPath.speedMps[0]-1e-12&&speed<=source.levelSpeedPath.speedMps.at(-1)+1e-12;
  }
  if(Math.abs(speed-source.fixedSpeedUphillPath.fixedSpeedMps)<=1e-12&&grade>=-1e-12){
    return grade>=source.fixedSpeedUphillPath.gradePercent[0]-1e-12&&grade<=source.fixedSpeedUphillPath.gradePercent.at(-1)+1e-12;
  }
  return false;
}

function sectionPassesBat009(section,runSetting){
  const grade=signedSectionGrade(section);
  return runSetting==="TREADMILL"&&Number.isFinite(grade)&&grade>=0&&grade<=7&&Number.isFinite(section.speedMps)&&Math.abs(section.speedMps-4.17)<=1e-9;
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
  // R20: historical project transfer retired. BAT-SRC-027 has one artificial
  // uneven treadmill condition at 2.3 m/s; this app has no exact apparatus
  // category, so no section is numeric-eligible for this route.
  void section;
  return false;
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
    metGates:a4HoriguchiSections.length?["continuous treadmill running","exact 3.33 m/s source speed","-6 to +6 degrees","RFS or FFS self-report","training shoe with normal softness proxy"]:[],
    unmetGates:a4HoriguchiSections.length===sections.length&&sections.length?[]:["all sections must share the same Horiguchi endpoint family and satisfy every source-protocol gate"],
    sourceIds:["RCM-ANCH-A4-001..011"],
    parameterIds:[],
  });
  const a6Ho2010HeelSections=sections.filter(section=>sectionPassesA6Ho2010Heel(section,runSetting));
  routes.push({
    routeId:"A6_HO2010_HEEL_PEAK_PRESSURE",
    state:a6Ho2010HeelSections.length===sections.length&&sections.length?"ACTIVE":a6Ho2010HeelSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-027"],
    metGates:a6Ho2010HeelSections.length?["continuous treadmill jogging","union of Ho 2010 level-speed path or fixed-2.0-m/s uphill path","no rectangular speed x grade expansion"]:[],
    unmetGates:a6Ho2010HeelSections.length===sections.length&&sections.length?[]:["all sections must stay on the same Ho 2010 heel peak-pressure endpoint family and on one of the two registered 1D protocol paths"],
    sourceIds:["A6R2-HO2010-TABLE1-HEEL","A6R2-HO2010-TABLE3-HEEL"],
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
    metGates:a3JointGradeSections.length?["treadmill setting","2.25 m/s source speed","non-level grade within source knots"]:[],
    unmetGates:a3JointGradeSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A3-001..015"],
    parameterIds:[],
  });
  const nonLevelSections=sections.filter(section=>{const grade=signedSectionGrade(section);return Number.isFinite(grade)&&Math.abs(grade)>1e-9;});
  routes.push({
    routeId:"A6_NUCKOLS_BOUNDED_GRADE_TRANSFER",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-014","BA-DISP-015","BA-DISP-016","BA-DISP-023","BA-DISP-024"],
    metGates:[],
    unmetGates:["R19 retired cross-speed/environment magnitude transfer; supporting studies do not calibrate Nuckols joint-power magnitude outside the 2.25 m/s treadmill protocol"],
    sourceIds:["SRC-SUP-003","SRC-A6-001","SRC-A6-002","SRC-A6-003","SRC-A6-004","SRC-A6-005"],
    parameterIds:[],
  });
  const nuckolsProxySections=nonLevelSections.filter(section=>sectionPassesA3JointGrade(section,runSetting));
  routes.push({
    routeId:"A6_NUCKOLS_SOURCE_PROTOCOL_PROXY",
    state:nuckolsProxySections.length===sections.filter(section=>Math.abs(signedSectionGrade(section)??0)>1e-9).length&&nuckolsProxySections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015","BA-DISP-023"],
    metGates:nuckolsProxySections.length?["treadmill setting","2.25 m/s source speed","non-level percent-grade within -10% to +10% source range"]:[],
    unmetGates:nuckolsProxySections.length?[]:["source-protocol proxy requires 2.25 m/s treadmill running at a non-level grade within source range"],
    sourceIds:["SRC-SUP-003"],
    parameterIds:[],
  });
  routes.push({
    routeId:"A6_BAT_SRC_019_LOCAL_GRADE_SPEED_ENVELOPE",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-015","BA-DISP-016","BA-DISP-018","BA-DISP-023"],
    metGates:[],
    unmetGates:["R15 retired the off-source local 2D grade-speed envelope; only the original paired BAT-SRC-019 path remains eligible"],
    sourceIds:["RCM-ANCH-A1-060..094","SRC-A6-003","SRC-A6-004"],
    parameterIds:[],
  });
  routes.push({
    routeId:"A3_E04_GROUP_MEAN_CADENCE",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-014","BA-DISP-016","BA-DISP-024"],
    metGates:[],
    unmetGates:["R17 retired absolute-cadence numeric mapping because Heiderscheit 2011 manipulated each runner's preferred step rate and the app lacks a source-compatible preferred baseline"],
    sourceIds:["RCM-ANCH-A3-016..030"],
    parameterIds:[],
  });
  routes.push({
    routeId:"A6_HAGEN2023_BA019_LOW_SPEED_PUBLISHED_MODEL",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-019"],
    metGates:[],
    unmetGates:["R22 retired cross-study normalization of the Hagen 2023 habitual PFJS impulse-per-km regression into Current Reference 100: study-specific absolute scales are not calibrated and the app cannot establish the source participant-specific habitual/preferred cadence state"],
    sourceIds:["SRC-A6-R6-001","BAT-SRC-010"],
    parameterIds:[],
  });
  const willerSpeedSections=sections.filter(section=>sectionPassesWillerSpeedWork(section,runSetting));
  routes.push({
    routeId:"A5_WILLER_2024_TABULATED_SPEED_WORK",
    state:willerSpeedSections.length===sections.length&&sections.length?"ACTIVE":willerSpeedSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-014","BA-DISP-016","BA-DISP-018","BA-DISP-023"],
    metGates:willerSpeedSections.length?["level instrumented-treadmill source family","2.78–5.00 m/s","Table 2 numeric work values","Table 1 cadence retained as descriptive provenance only"]:[],
    unmetGates:willerSpeedSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["SRC-A5-001"],
    parameterIds:[],
  });
  const a3FigureSpeedSections=sections.filter(section=>sectionPassesA3FigureSpeed(section,runSetting));
  routes.push({
    routeId:"A3_E02_FIGURE_DIGITIZED_SPEED",
    state:a3FigureSpeedSections.length===sections.length&&sections.length?"ACTIVE":a3FigureSpeedSections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015","BA-DISP-023"],
    metGates:a3FigureSpeedSections.length?["treadmill setting","level grade","2–5 m/s","group-mean stride-time cadence retained as descriptive provenance only","figure-digitized low-confidence proxy"]:[],
    unmetGates:a3FigureSpeedSections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A3-034..043"],
    parameterIds:[],
  });
  const bat009Sections=sections.filter(section=>sectionPassesBat009(section,runSetting));
  routes.push({
    routeId:"BAT_SRC_009_GRADE_EXACT",
    state:bat009Sections.length===sections.length&&sections.length?"ACTIVE":bat009Sections.length?"PARTIAL":"INACTIVE",
    regionIds:["BA-DISP-015","BA-DISP-016","BA-DISP-023"],
    metGates:bat009Sections.length?["exact 4.17 m/s source speed","0–7% uphill grade (source knots or bounded within-study interpolation)"]:[],
    unmetGates:bat009Sections.length===sections.length&&sections.length?[]:["one or more section-level source gates unmet"],
    sourceIds:["RCM-ANCH-A1-040..042","RCM-ANCH-A1-057..059","RCM-ANCH-A3-031..033"],
    parameterIds:[],
  });
  const gradeSpeedSections=sections.filter(sectionPassesGradeSpeedProfile);
  routes.push({
    routeId:"BAT_SRC_019_GRADE_SPEED_PROFILE",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-015","BA-DISP-016","BA-DISP-018","BA-DISP-023"],
    metGates:[],
    unmetGates:["R21 retired numeric use of BAT-SRC-019 group-mean grade-speed values: source speed was prescribed individually from 10-km performance and the app cannot reproduce that participant-specific protocol; former ±0.15 m/s matching had no source basis"],
    sourceIds:["RCM-ANCH-A1-060..094"],
    parameterIds:[],
  });
  routes.push({
    routeId:"BOUNDED_UNEVENNESS_X_SPEED",
    state:"UNAVAILABLE",
    regionIds:["BA-DISP-016","BA-DISP-018","BA-DISP-024"],
    metGates:[],
    unmetGates:["R20 retired the project ordinal/speed transfer: BAT-SRC-027 measured one artificial uneven treadmill apparatus at 2.3 m/s, which is not represented as an exact app source category"],
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
