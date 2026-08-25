import { ADAPTER_VERSION, AUTHORITY_VERSION, FORMAL_INPUT_CATALOG } from "./data.js";
import { hashCanonical } from "./sha256.js";
import { resolveSurfaceSelections } from "./presets.js";
import { failure, success } from "./utils.js";
import { validateFormalBundleSemantics, validatePrototypeRecordInput } from "./validation.js";

const catalogById = new Map(FORMAL_INPUT_CATALOG.map(item => [item.id, item]));
const PLAN_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "PLAN_ONLY_NO_COMPLETED_SESSION_EFFECT").map(x => x.id));
const TEXT_IDS = new Set(FORMAL_INPUT_CATALOG.filter(x => x.disposition === "TRACE_EXPLANATION_COMPARISON_ONLY").map(x => x.id));

function emptyEntry(item) {
  const status = PLAN_IDS.has(item.id) ? "NOT_SET" : TEXT_IDS.has(item.id) ? "NOT_RECORDED" : "UNKNOWN";
  return { inputId:item.id, technicalName:item.technicalName, status, value:null, unit:null,
    provenance:"UNKNOWN", confidence:"UNKNOWN", sourceField:null, presetVersion:ADAPTER_VERSION,
    numericPermission:item.numericPermission, notes:null };
}

function buildEmptyMap() { return Object.fromEntries(FORMAL_INPUT_CATALOG.map(item => [item.id, emptyEntry(item)])); }
function setEntry(map, id, value, {status="KNOWN", unit=null, provenance="USER", confidence="HIGH", sourceField=null, notes=null}={}) {
  if (!catalogById.has(id)) throw new Error(`Unknown formal input ID ${id}`);
  map[id] = {...map[id], status, value, unit, provenance, confidence, sourceField, notes};
}
function setNull(map,id,status="UNKNOWN",provenance="UNKNOWN",sourceField=null) { setEntry(map,id,null,{status,provenance,confidence:"UNKNOWN",sourceField}); }

function deriveRunSetting(surface) {
  if (!surface?.components?.length) return "UNKNOWN";
  const settings = new Set(surface.components.map(c=>c.runSetting));
  if (settings.size === 1) return [...settings][0];
  return "OUTDOOR_ROUTE";
}

function approximatelyEqual(a,b,tolerance=1e-9){
  return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b));
}

function explicitSectionRepresentsWholeRun(section,sectionCount,wholeDistanceKm){
  if(sectionCount!==1)return false;
  if(Number.isFinite(section.distanceKm)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.distanceKm,wholeDistanceKm);
  if(Number.isFinite(section.sharePercent))return approximatelyEqual(section.sharePercent,100);
  if(section.shareBasis==="DISTANCE"&&Number.isFinite(section.shareValue)&&Number.isFinite(wholeDistanceKm))return approximatelyEqual(section.shareValue,wholeDistanceKm);
  return false;
}

function buildSummarySections(ui, surface) {
  const distance = ui.distanceKm;
  const duration = ui.durationMinutes;
  const steps = ui.steps ?? null;
  const speed = distance && duration ? distance * 1000 / (duration * 60) : null;
  const cadence = steps != null && duration ? steps / duration : null;
  const course = ui.course ?? {};
  if (Array.isArray(course.sections) && course.sections.length) {
    const sectionCount=course.sections.length;
    return course.sections.map((s,i)=>{
      const homogeneousWholeRun=explicitSectionRepresentsWholeRun(s,sectionCount,distance);
      const derivedSectionSpeed=s.distanceKm && s.durationMinutes ? s.distanceKm*1000/(s.durationMinutes*60) : null;
      const derivedSectionCadence=s.steps!=null && s.durationMinutes ? s.steps/s.durationMinutes : null;
      return {
        sectionId:s.sectionId ?? `section-${i+1}`, shareBasis:s.shareBasis ?? "DISTANCE", shareValue:s.shareValue ?? s.distanceKm ?? 1,
        distanceKm:s.distanceKm ?? null, durationMinutes:s.durationMinutes ?? null, steps:s.steps ?? null,
        speedMps:Number.isFinite(s.speedMps) ? s.speedMps : (Number.isFinite(derivedSectionSpeed) ? derivedSectionSpeed : (homogeneousWholeRun ? speed : null)),
        cadenceSpm:Number.isFinite(s.cadenceSpm) ? s.cadenceSpm : (Number.isFinite(derivedSectionCadence) ? derivedSectionCadence : (homogeneousWholeRun ? cadence : null)),
        gradeDirection:s.gradeDirection ?? "UNKNOWN", gradePercent:s.gradePercent ?? null,
        runningFormat:s.runningFormat ?? ui.runningFormat ?? "UNKNOWN",
        surfacePresetKeys:surface.components.map(c=>c.presetKey),
        surfaceComponents:surface.components,
      };
    });
  }
  const gradeKnowledge=course.gradeKnowledge ?? "UNKNOWN";
  if (gradeKnowledge === "KNOWN_SUMMARY") {
    const up=course.uphillSharePercent ?? 0, down=course.downhillSharePercent ?? 0, flat=100-up-down;
    if (flat < -0.01) throw Object.assign(new Error("Grade shares exceed 100"),{code:"SECTION_SHARE_INVALID",path:"course"});
    const defs=[];
    if (up>0) defs.push(["UPHILL",up,course.uphillGradePercent]);
    if (down>0) defs.push(["DOWNHILL",down,course.downhillGradePercent]);
    if (flat>0) defs.push(["FLAT",flat,0]);
    const homogeneousWholeRun=defs.length===1&&approximatelyEqual(defs[0][1],100);
    return defs.map(([dir,share,g],i)=>({sectionId:`section-${i+1}`,shareBasis:"DISTANCE",shareValue:distance*share/100,
      distanceKm:distance*share/100,durationMinutes:homogeneousWholeRun?duration:null,steps:homogeneousWholeRun?steps:null,
      speedMps:homogeneousWholeRun?speed:null,cadenceSpm:homogeneousWholeRun?cadence:null,
      gradeDirection:dir,gradePercent:g??null,runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}));
  }
  return [{sectionId:"section-1",shareBasis:"DISTANCE",shareValue:distance??1,distanceKm:distance??null,durationMinutes:duration??null,steps,
    speedMps:speed,cadenceSpm:cadence,gradeDirection:gradeKnowledge==="KNOWN_FLAT"?"FLAT":"UNKNOWN",gradePercent:gradeKnowledge==="KNOWN_FLAT"?0:null,
    runningFormat:ui.runningFormat??"UNKNOWN",surfacePresetKeys:surface.components.map(c=>c.presetKey),surfaceComponents:surface.components}];
}

export function adaptPrototypeRecord(uiInput, context={}) {
  try {
    const inputIssues = validatePrototypeRecordInput(uiInput);
    if (inputIssues.length) return failure("SCHEMA_INVALID","input.schema_invalid",inputIssues[0].path,{issues:inputIssues});
    if (!uiInput || typeof uiInput !== "object") return failure("SCHEMA_INVALID","input.must_be_object","");
    if (!context.sessionId && !uiInput.sessionId) return failure("SCHEMA_INVALID","session_id.required","context.sessionId");
    if (!uiInput.date) return failure("SCHEMA_INVALID","session_date.required","date");
    if (!["run","rest"].includes(uiInput.activityType)) return failure("SCHEMA_INVALID","activity_type.invalid","activityType");
    if (uiInput.activityType === "run" && (!(uiInput.distanceKm>0) || !(uiInput.durationMinutes>0))) return failure("SCHEMA_INVALID","run.distance_duration.required","distanceKm");
    const map=buildEmptyMap();
    const sessionId=context.sessionId ?? uiInput.sessionId;
    const revision=context.recordRevision ?? 1;
    setEntry(map,"RL-IN-001",uiInput.activityType==="run"?"RUNNING_DAY":"RUNNING_REST_DAY",{provenance:"DERIVED",sourceField:"activityType"});
    setEntry(map,"RL-IN-002",uiInput.date,{sourceField:"date"});
    setEntry(map,"RL-IN-003",uiInput.activityType.toUpperCase(),{sourceField:"activityType"});
    setEntry(map,"RL-IN-004",sessionId,{provenance:"SYSTEM",sourceField:"context.sessionId"});
    setEntry(map,"RL-IN-005",context.sessionSequence??1,{provenance:"SYSTEM",sourceField:"context.sessionSequence"});
    setEntry(map,"RL-IN-007",revision,{provenance:"SYSTEM",sourceField:"context.recordRevision"});
    if (uiInput.memo) setEntry(map,"RL-IN-006",uiInput.memo,{sourceField:"memo"});

    if (uiInput.activityType === "rest") {
      for (const id of ["RL-IN-010","RL-IN-011","RL-IN-012","RL-IN-013","RL-IN-014","RL-IN-015","RL-DV-019","RL-DV-020","RL-DV-021"]) setNull(map,id,"NOT_APPLICABLE","DERIVED");
    } else {
      setEntry(map,"RL-IN-010","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-011",uiInput.distanceKm,{unit:"km",sourceField:"distanceKm"});
      setEntry(map,"RL-IN-012","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-013",uiInput.durationMinutes,{unit:"min",sourceField:"durationMinutes"});
      const speed=uiInput.distanceKm*1000/(uiInput.durationMinutes*60), pace=uiInput.durationMinutes/uiInput.distanceKm;
      setEntry(map,"RL-DV-019",speed,{unit:"m/s",provenance:"DERIVED"}); setEntry(map,"RL-DV-020",pace,{unit:"min/km",provenance:"DERIVED"});
      if (Number.isInteger(uiInput.steps) && uiInput.steps>=0) {
        setEntry(map,"RL-IN-014","VALUE",{provenance:"DERIVED"}); setEntry(map,"RL-IN-015",uiInput.steps,{unit:"steps",sourceField:"steps"});
        const prov=uiInput.stepsProvenance==="ESTIMATED"?"MANUAL_ESTIMATE":uiInput.stepsProvenance??"UNKNOWN";
        setEntry(map,"RL-IN-016",prov,{sourceField:"stepsProvenance"});
        if (["DEVICE_MEASURED","DEVICE_SYNCED"].includes(prov)) setEntry(map,"RL-DV-021",uiInput.steps/uiInput.durationMinutes,{unit:"steps/min",provenance:"DERIVED"});
        else setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      } else {
        setEntry(map,"RL-IN-014","NOT_RECORDED",{provenance:"DERIVED"}); setNull(map,"RL-IN-015","NOT_RECORDED","USER","steps"); setNull(map,"RL-IN-016","UNKNOWN","USER","stepsProvenance"); setNull(map,"RL-DV-021","UNKNOWN","DERIVED");
      }
      setEntry(map,"RL-IN-017",uiInput.runningFormat??"UNKNOWN",{sourceField:"runningFormat"});
    }

    const surfaceResult=resolveSurfaceSelections(uiInput.course?.surfaceSelections);
    if (!surfaceResult.ok) return surfaceResult;
    const surface=surfaceResult.value;
    setEntry(map,"RL-IN-018",deriveRunSetting(surface),{provenance:"DERIVED"});
    if (uiInput.course?.courseId) setEntry(map,"RL-IN-030",uiInput.course.courseId,{sourceField:"course.courseId"});
    if (uiInput.course?.courseName) setEntry(map,"RL-IN-031",uiInput.course.courseName,{sourceField:"course.courseName"});
    const gk=uiInput.course?.gradeKnowledge??"UNKNOWN"; setEntry(map,"RL-IN-032",gk,{sourceField:"course.gradeKnowledge"});
    if (gk==="KNOWN_FLAT") {setEntry(map,"RL-IN-033",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-IN-034",0,{unit:"%",provenance:"DERIVED"});setEntry(map,"RL-DV-035",100,{unit:"%",provenance:"DERIVED"});}
    else if (gk==="KNOWN_SUMMARY") {const up=uiInput.course?.uphillSharePercent??0,down=uiInput.course?.downhillSharePercent??0,flat=100-up-down;if(flat<-.01)return failure("SECTION_SHARE_INVALID","grade.share_sum_invalid","course",{up,down});setEntry(map,"RL-IN-033",up,{unit:"%",sourceField:"course.uphillSharePercent"});setEntry(map,"RL-IN-034",down,{unit:"%",sourceField:"course.downhillSharePercent"});setEntry(map,"RL-DV-035",flat,{unit:"%",provenance:"DERIVED"});if(up>0&&uiInput.course.uphillGradePercent!=null)setEntry(map,"RL-IN-036",uiInput.course.uphillGradePercent,{unit:"%",sourceField:"course.uphillGradePercent"});if(down>0&&uiInput.course.downhillGradePercent!=null)setEntry(map,"RL-IN-037",uiInput.course.downhillGradePercent,{unit:"%",sourceField:"course.downhillGradePercent"});}
    setEntry(map,"RL-IN-038",uiInput.course?.routePattern??"UNKNOWN",{sourceField:"course.routePattern"});
    const sections=uiInput.activityType==="run"?buildSummarySections(uiInput,surface):[];
    setEntry(map,"RL-IN-039",sections,{provenance:"DERIVED",sourceField:"course"});
    setEntry(map,"RL-IN-040",surface.knowledge,{provenance:"DERIVED"});
    if(surface.components.length){setEntry(map,"RL-IN-041",surface.components,{provenance:"PRESET"});setEntry(map,"RL-IN-042",surface.components.length===1?surface.dominant.materialLabel:"MIXED",{provenance:"PRESET"});setEntry(map,"RL-IN-043",surface.dominant.sharePercent,{unit:"%",provenance:"PRESET"});for(const [id,key] of [["RL-IN-044","hardnessLevel"],["RL-IN-045","unevennessLevel"],["RL-IN-046","gripLevel"],["RL-IN-047","sinkLevel"],["RL-IN-048","reboundLevel"],["RL-IN-049","stabilityLevel"],["RL-IN-050","wetSlipState"]]){const value=surface.dominant.propertyProfile[key]; if(value==null||value==="UNKNOWN")setNull(map,id,"UNKNOWN","PRESET");else setEntry(map,id,value,{provenance:surface.dominant.propertyOrigin});}}

    const ss=uiInput.shoeAndStyle??{};
    if(ss.shoeId)setEntry(map,"RL-IN-070",ss.shoeId,{sourceField:"shoeAndStyle.shoeId"});if(ss.shoeLabel)setEntry(map,"RL-IN-071",ss.shoeLabel,{sourceField:"shoeAndStyle.shoeLabel"});
    if(ss.shoeType)setEntry(map,"RL-IN-072",ss.shoeType,{sourceField:"shoeAndStyle.shoeType"});if(ss.shoeSoftness)setEntry(map,"RL-IN-073",ss.shoeSoftness,{sourceField:"shoeAndStyle.shoeSoftness"});
    if(ss.footPlacement)setEntry(map,"RL-IN-080",ss.footPlacement,{sourceField:"shoeAndStyle.footPlacement",confidence:"MODERATE"});if(ss.rhythmStride)setEntry(map,"RL-IN-081",ss.rhythmStride,{sourceField:"shoeAndStyle.rhythmStride"});
    if(Array.isArray(ss.focusTags)&&ss.focusTags.length)setEntry(map,"RL-IN-082",ss.focusTags,{sourceField:"shoeAndStyle.focusTags"});if(ss.note)setEntry(map,"RL-IN-083",ss.note,{sourceField:"shoeAndStyle.note"});

    if(uiInput.rpe!=null){setEntry(map,"RL-IN-090","REPORTED",{provenance:"DERIVED"});setEntry(map,"RL-IN-091",uiInput.rpe,{sourceField:"rpe"});setEntry(map,"RL-IN-092","USER_REPORTED",{provenance:"DERIVED"});}
    else {setEntry(map,"RL-IN-090","NOT_REPORTED",{provenance:"DERIVED"});setNull(map,"RL-IN-091","NOT_RECORDED","USER","rpe");setEntry(map,"RL-IN-092","UNKNOWN",{provenance:"DERIVED"});}

    const br=uiInput.bodyReview??{status:"NOT_REVIEWED",observations:[]}; setEntry(map,"RL-IN-100",br.status,{sourceField:"bodyReview.status"});
    const obs=Array.isArray(br.observations)?br.observations:[]; setEntry(map,"RL-IN-101",obs,{sourceField:"bodyReview.observations"});
    if(obs.length===1){const o=obs[0];setEntry(map,"RL-IN-102",o.bodyAreaId,{sourceField:"bodyReview.observations[0].bodyAreaId"});setEntry(map,"RL-IN-103",o.laterality,{sourceField:"bodyReview.observations[0].laterality"});setEntry(map,"RL-IN-104",o.noticedIntensity,{sourceField:"bodyReview.observations[0].noticedIntensity"});setEntry(map,"RL-IN-105",o.sensationType??"NOT_SELECTED",{sourceField:"bodyReview.observations[0].sensationType"});setEntry(map,"RL-IN-106",o.noticedTiming,{sourceField:"bodyReview.observations[0].noticedTiming"});if(o.note)setEntry(map,"RL-IN-107",o.note,{sourceField:"bodyReview.observations[0].note"});}

    const profile=context.profile??{}; for(const [id,key,unit] of [["RL-IN-113","heightCm","cm"],["RL-IN-114","weightKg","kg"],["RL-IN-115","ageBand",null],["RL-IN-116","sexOrReferenceCategory",null]]) if(profile[key]!=null)setEntry(map,id,profile[key],{unit,provenance:"SNAPSHOT",sourceField:`context.profile.${key}`});
    const plan=uiInput.plan??{}; if(plan.scheduledDate)setEntry(map,"RL-IN-130",plan.scheduledDate,{sourceField:"plan.scheduledDate"});if(plan.planType)setEntry(map,"RL-IN-131",plan.planType,{sourceField:"plan.planType"});if(plan.distanceKm!=null){setEntry(map,"RL-IN-132","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-133",plan.distanceKm,{unit:"km",sourceField:"plan.distanceKm"});}if(plan.durationMinutes!=null){setEntry(map,"RL-IN-134","VALUE",{provenance:"DERIVED"});setEntry(map,"RL-IN-135",plan.durationMinutes,{unit:"min",sourceField:"plan.durationMinutes"});}if(plan.course)setEntry(map,"RL-IN-136",plan.course,{sourceField:"plan.course"});if(plan.note)setEntry(map,"RL-IN-137",plan.note,{sourceField:"plan.note"});if(plan.outcomeStatus)setEntry(map,"RL-IN-138",plan.outcomeStatus,{sourceField:"plan.outcomeStatus"});if(plan.changeReason)setEntry(map,"RL-IN-139",plan.changeReason,{sourceField:"plan.changeReason"});if(plan.actualSessionId)setEntry(map,"RL-IN-140",plan.actualSessionId,{sourceField:"plan.actualSessionId"});

    const inputSnapshotHash=hashCanonical(map);
    return success({schemaVersion:"runload-formal-input-bundle-1.0",authorityVersion:AUTHORITY_VERSION,adapterVersion:ADAPTER_VERSION,
      recordSnapshot:{sessionId,recordRevision:revision,sessionDate:uiInput.date,activityType:uiInput.activityType.toUpperCase(),presetSnapshotVersion:ADAPTER_VERSION,inputSnapshotHash},formalInputs:map},surfaceResult.warnings??[]);
  } catch(error){return failure(error.code??"SCHEMA_INVALID","adapter.failed",error.path??"",{message:error.message});}
}

export function validateFormalInputBundle(bundle){
  const issues=[]; if(!bundle||typeof bundle!=="object")return {valid:false,issues:[{code:"SCHEMA_INVALID",messageKey:"bundle.invalid",path:"",details:{}}]};
  const actual=Object.keys(bundle.formalInputs??{}), expected=FORMAL_INPUT_CATALOG.map(x=>x.id);
  for(const id of expected)if(!(id in (bundle.formalInputs??{})))issues.push({code:"MISSING_FORMAL_INPUT_ENTRY",messageKey:"formal_input.missing",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual)if(!catalogById.has(id))issues.push({code:"UNKNOWN_FORMAL_INPUT_ID",messageKey:"formal_input.unknown",path:`formalInputs.${id}`,details:{id}});
  for(const id of actual){const e=bundle.formalInputs[id];if(["UNKNOWN","NOT_RECORDED","NOT_SET","NOT_APPLICABLE"].includes(e.status)&&e.value!==null)issues.push({code:"STATUS_VALUE_CONFLICT",messageKey:"formal_input.status_value_conflict",path:`formalInputs.${id}.value`,details:{status:e.status}});}
  issues.push(...validateFormalBundleSemantics(bundle));
  const uniqueIssues=[...new Map(issues.map(item=>[`${item.code}|${item.path}`,item])).values()];
  return {valid:uniqueIssues.length===0,issues:uniqueIssues};
}
