import { RETAINED_INPUTS } from './nextPrimaryR12Trace.js';
import { buildNewModelV1FormalInputTrace } from '../newModelV1/newModelV1TraceAdapter.js';

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function speedOf(record={}){const d=Number(record.distanceKm),t=Number(record.durationMinutes);return d>0&&t>0?d*1000/(t*60):null;}
function median(values=[]){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function normalizeSurfaceCategory(v){const x=String(v||'').toUpperCase();if(x.includes('NATURAL_GRASS'))return 'NATURAL_GRASS';if(x==='PAVED'||x==='ASPHALT')return 'ASPHALT';if(x.includes('TRACK')||x.includes('RUBBER'))return 'RUBBER_TRACK';if(x.includes('TREADMILL'))return 'TREADMILL_BELT';if(x.includes('SOIL'))return 'SOIL';if(x.includes('TRAIL'))return 'TRAIL';if(x.includes('ARTIFICIAL'))return 'ARTIFICIAL_TURF';if(x.includes('SAND'))return 'SAND';return x||'UNKNOWN';}
function surfaceComponentsFromCourse(course={}){const defs=[['pavedPercent','ASPHALT'],['trackPercent','RUBBER_TRACK'],['treadmillPercent','TREADMILL_BELT'],['soilPercent','SOIL'],['trailPercent','TRAIL'],['naturalGrassPercent','NATURAL_GRASS'],['artificialTurfPercent','ARTIFICIAL_TURF'],['sandPercent','SAND']];return defs.flatMap(([k,c])=>{const n=Number(course?.[k]||0);return n>0?[{category:c,sharePercent:n}]:[]});}
function runSettingFromCourse(course={}){const t=Number(course?.treadmillPercent||0),other=['pavedPercent','trackPercent','soilPercent','trailPercent','naturalGrassPercent','artificialTurfPercent','sandPercent'].reduce((s,k)=>s+Number(course?.[k]||0),0);if(t>0&&other===0)return 'TREADMILL';if(other>0&&t===0)return 'OUTDOOR_ROUTE';if(t>0&&other>0)return 'MIXED_SETTING';return null;}
function sectionGradePercent(s={}){const g=Math.abs(Number(s.gradePercent||0));const d=String(s.gradeDirection||'FLAT').toUpperCase();if(d==='UPHILL')return g;if(d==='DOWNHILL')return -g;return 0;}
function mapSections(items=[]){return (Array.isArray(items)?items:[]).map(s=>({sharePercent:s.sharePercent??null,distanceKm:s.distanceKm??null,durationMinutes:s.durationMinutes??null,gradePercent:sectionGradePercent(s),surfaceComponents:(Array.isArray(s.surfaceComponents)?s.surfaceComponents:[]).map(c=>({category:normalizeSurfaceCategory(c.userCategory||c.category),sharePercent:Number(c.sharePercent||0)})),runSetting:null}));}
function strikeObservation(record={}){const raw=String(record.personalContext?.footPlacement||'').toUpperCase();let value=null;if(['HEEL','RFS','REARFOOT'].includes(raw))value='RFS';else if(['FOREFOOT','FFS'].includes(raw))value='FFS';else if(['MIDFOOT','MFS'].includes(raw))value='MFS';return value?{value,provenance:'SELF_REPORTED'}:null;}

export function personalHabitualCadenceReference(record={},allRecords=[]){
  if(String(record.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const currentSpeed=speedOf(record);if(!(currentSpeed>0))return {value:null,state:'REFERENCE_BUILDING',eligibleCount:0};
  const sorted=[...(allRecords||[])].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
  const idx=sorted.findIndex(x=>x.id===record.id);const prior=idx>=0?sorted.slice(0,idx):sorted.filter(x=>x.id!==record.id&&String(x.date||'')<=String(record.date||''));
  const cadences=[];
  for(const r of prior){
    if(String(r.activityType||'').toLowerCase()!=='run'||String(r.runningFormat||'').toUpperCase()!=='CONTINUOUS_RUN')continue;
    if(!['DEVICE_MEASURED','DEVICE_SYNCED'].includes(String(r.stepsProvenance||'').toUpperCase()))continue;
    const sp=speedOf(r),steps=Number(r.steps),dur=Number(r.durationMinutes);if(!(sp>0&&steps>0&&dur>0))continue;
    if(Math.abs(sp-currentSpeed)>0.10+1e-12)continue;
    cadences.push(steps/dur);
  }
  return cadences.length>=3?{value:median(cadences),state:'MODEL_DERIVED_PERSONAL_REFERENCE',eligibleCount:cadences.length,speedNeighborhoodMps:0.10}:{value:null,state:'REFERENCE_BUILDING',eligibleCount:cadences.length,speedNeighborhoodMps:0.10};
}

function rawRepairValue(name,record={},feedback={}){
  const map={
    weatherState:()=>record.environmentContext?.weather,
    temperatureC:()=>record.environmentContext?.temperatureC,
    windLevel:()=>record.environmentContext?.windSummary,
    environmentNote:()=>record.environmentContext?.environmentNote,
    'equipmentTags[]':()=>record.personalContext?.equipmentTags,
    equipmentNote:()=>record.personalContext?.equipmentNote,
    postRunReflection:()=>record.reflectionContext?.postRunReflection,
    perceivedDifference:()=>record.reflectionContext?.perceivedDifference,
    runningStartDateOrBand:()=>record.bodyProfileSnapshot?.runningStartDateOrBand,
    experienceSelfAssessment:()=>record.bodyProfileSnapshot?.experienceSelfAssessment,
    'runningGoalTags[]':()=>record.bodyProfileSnapshot?.runningGoalTags,
    sleepSummary:()=>record.recoveryContext?.sleepSummary,
    nutritionHydrationSummary:()=>record.recoveryContext?.nutritionHydrationSummary,
    lifestyleNote:()=>record.recoveryContext?.lifestyleNote,
    reflectionKeyPoint:()=>record.reflectionContext?.reflectionKeyPoint,
    nextCheckPoint:()=>record.reflectionContext?.nextCheckPoint,
    consultationTarget:()=>record.consultationContext?.consultationTarget,
    consultationQuestion:()=>record.consultationContext?.consultationQuestion,
    consultationDataSelection:()=>record.consultationContext?.consultationDataSelection,
  };return map[name]?clone(map[name]()):undefined;
}

export function buildAppRetainedInputTrace({record,feedback={},sessionSequence=1}={}){
  const currentTrace=buildNewModelV1FormalInputTrace({record,feedback,sessionSequence});
  if(!currentTrace.ok)return currentTrace;
  const formal=currentTrace.value?.formalInputs||{};
  const entries=RETAINED_INPUTS.map(d=>{
    const f=formal[d.inputId]||null; let value=f?.value??null; let status=f?.status||'MISSING'; let provenance=f?.provenance||null;
    if(d.traceAction==='R12_REPAIR_REQUIRED'){
      const raw=rawRepairValue(d.technicalName,record,feedback);
      if(raw!==undefined&&raw!==null&&!(Array.isArray(raw)&&raw.length===0)&&raw!==''){value=raw;status='KNOWN';provenance='R12_RAW_RECORD_REPAIR';}
    }
    return {...d,present:status==='KNOWN'||status==='EXPLICIT_UNKNOWN',value,status,provenance,currentFormalInput:f};
  });
  return {ok:true,value:{count:entries.length,entries,runSettingProvenance:'SURFACE_DERIVED',traceVersion:'r12-app-integration-v0.2',formalInputCount:Object.keys(formal).length},uiInput:currentTrace.uiInput};
}

export function adaptCurrentRecordToR12Candidate({record,allRecords=[]}={}){
  const fmt=String(record.runningFormat||'UNKNOWN').toUpperCase();const course=record.course||{};const ref=personalHabitualCadenceReference(record,allRecords);
  const runWalk=fmt==='RUN_WALK';const sections=mapSections(runWalk?record.runWalkRunningSections:course.sections);
  const target={
    runningFormat:runWalk?'RUN_WALK':fmt==='CONTINUOUS_RUN'?'RUN':fmt,
    distanceKm:Number(record.distanceKm)||null,
    durationMinutes:Number(record.durationMinutes)||null,
    runningDistanceKm:runWalk?Number(record.runWalkRunningDistanceKm)||null:null,
    runningDurationMinutes:runWalk?Number(record.runWalkRunningDurationMinutes)||null:null,
    steps:Number(record.steps)||null,
    stepsProvenance:record.stepsProvenance||'UNKNOWN',
    averageCadenceSpm:(!runWalk&&Number(record.steps)>0&&Number(record.durationMinutes)>0)?Number(record.steps)/Number(record.durationMinutes):null,
    personalHabitualCadenceSpm:ref.value,
    personalHabitualCadenceReferenceState:ref.state,
    personalHabitualCadenceEligibleCount:ref.eligibleCount,
    segments:sections.length?sections:null,
    uphillSharePercent:sections.length?null:Number(course.upPercent||0),
    downhillSharePercent:sections.length?null:Number(course.downPercent||0),
    uphillGradePercent:sections.length?null:Number(course.upGradePercent||0),
    downhillGradePercent:sections.length?null:Number(course.downGradePercent||0),
    surfaceComponents:sections.length?null:surfaceComponentsFromCourse(course),
    runSetting:runSettingFromCourse(course),
    runSettingProvenance:'SURFACE_DERIVED',
    footStrikeObservation:strikeObservation(record),
    allowR12GrassEnvelope:true,
  };
  return target;
}
