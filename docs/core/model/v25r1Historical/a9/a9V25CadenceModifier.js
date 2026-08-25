import { REGIONAL_MODEL_SNAPSHOT_IDS, regionalModelSnapshotForRecord } from "../regionalModelSnapshot.js";

export const A9_V25R1_CADENCE_VERSION = "RunLoad-V2.5R1-cadence-personal-reference-v1.0";
export const A9_V25R1_CADENCE_TARGET_REGION = "BA-DISP-019";
export const A9_V25R1_CADENCE_SOURCE_ID = "HAGEN_2023";
const SPEEDS = Object.freeze([8/3.6, 10/3.6, 12/3.6, 14/3.6, 16/3.6]);
const DECREASED = Object.freeze([624.47, 528.12, 466.03, 388.01, 325.91]);
const HABITUAL = Object.freeze([563.11, 470.14, 411.02, 361.11, 305.97]);
const INCREASED = Object.freeze([461.71, 406.25, 366.64, 318.87, 281.82]);
const TOLERANCES = Object.freeze([0.05, 0.10, 0.15]);
const EPS = 1e-10;
const reliable = value => ["DEVICE_MEASURED", "DEVICE_SYNCED"].includes(String(value || "").toUpperCase());
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const speedOf = record => {
  const d=positive(record?.distanceKm), t=positive(record?.durationMinutes);
  return d&&t ? d*1000/(t*60) : null;
};
const cadenceOf = record => {
  const s=positive(record?.steps), t=positive(record?.durationMinutes);
  return s&&t ? s/t : null;
};
const median = values => {
  const xs=[...values].map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length)return null;
  const m=Math.floor(xs.length/2);
  return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;
};
function interp(xs,ys,x){
  if(!Number.isFinite(x)||x<xs[0]-EPS||x>xs.at(-1)+EPS)return null;
  for(let i=0;i<xs.length;i++)if(Math.abs(x-xs[i])<=EPS)return ys[i];
  for(let i=0;i<xs.length-1;i++)if(x>=xs[i]-EPS&&x<=xs[i+1]+EPS){const t=(x-xs[i])/(xs[i+1]-xs[i]);return ys[i]+t*(ys[i+1]-ys[i]);}
  return null;
}
function priorEligible(record,currentSpeed,tolerance,currentId){
  return record?.id !== currentId
    && record?.activityType === "run"
    && record?.runningFormat === "CONTINUOUS_RUN"
    && reliable(record?.stepsProvenance)
    && regionalModelSnapshotForRecord(record).snapshotId === REGIONAL_MODEL_SNAPSHOT_IDS.v25r1
    && Number.isFinite(speedOf(record))
    && Math.abs(speedOf(record)-currentSpeed)<=tolerance+EPS
    && Number.isFinite(cadenceOf(record));
}
export function deriveV25R1PersonalHabitualCadence({currentRecord={}, priorRecords=[]}={}){
  const currentSpeed=speedOf(currentRecord), currentCadence=cadenceOf(currentRecord);
  const currentReliable=reliable(currentRecord.stepsProvenance);
  const continuous=currentRecord?.activityType==="run"&&currentRecord?.runningFormat==="CONTINUOUS_RUN";
  const currentFamily=regionalModelSnapshotForRecord(currentRecord).snapshotId===REGIONAL_MODEL_SNAPSHOT_IDS.v25r1;
  if(!currentSpeed||!currentCadence||!currentReliable||!continuous||!currentFamily){
    return Object.freeze({state:"NOT_APPLICABLE",robustnessState:"UNAVAILABLE_AT_CENTRAL_TOLERANCE",currentSpeedMps:currentSpeed,currentCadenceSpm:currentCadence,centralEligibleN:0,expectedCadenceSpm:null,byTolerance:Object.freeze({})});
  }
  const byTolerance={};
  for(const tol of TOLERANCES){
    const eligible=priorRecords.filter(r=>priorEligible(r,currentSpeed,tol,currentRecord.id));
    byTolerance[String(tol)] = Object.freeze({
      toleranceMps:tol,
      state:eligible.length>=3?"AVAILABLE":"BUILDING_REFERENCE",
      eligibleN:eligible.length,
      expectedCadenceSpm:eligible.length>=3?median(eligible.map(cadenceOf)):null,
      referenceRecordIds:Object.freeze(eligible.map(r=>String(r.id)).sort()),
    });
  }
  const central=byTolerance["0.1"];
  const robust=Object.values(byTolerance).every(x=>x.state==="AVAILABLE");
  return Object.freeze({
    state:robust?"AVAILABLE":"BUILDING_REFERENCE",
    robustnessState:robust?"ROBUST_ACROSS_DECLARED_TOLERANCES":(central.state==="AVAILABLE"?"TOLERANCE_DEPENDENT":"UNAVAILABLE_AT_CENTRAL_TOLERANCE"),
    currentSpeedMps:currentSpeed,
    currentCadenceSpm:currentCadence,
    centralEligibleN:central.eligibleN,
    expectedCadenceSpm:robust?central.expectedCadenceSpm:null,
    byTolerance:Object.freeze(byTolerance),
  });
}
export function evaluateV25R1CadenceModifier(regionId, context={}){
  const ref=context?.cadenceReference;
  if(regionId!==A9_V25R1_CADENCE_TARGET_REGION)return Object.freeze({applicable:false,state:"NOT_TARGET_REGION",numericEffectApplied:false,modifier:null});
  const speed=Number(context?.speedMps), current=positive(context?.cadenceSpm), expected=positive(ref?.expectedCadenceSpm);
  if(ref?.state!=="AVAILABLE"||ref?.robustnessState!=="ROBUST_ACROSS_DECLARED_TOLERANCES"||!current||!expected){
    return Object.freeze({applicable:true,state:"BUILDING_REFERENCE",numericEffectApplied:false,modifier:null,reference:ref||null});
  }
  if(!Number.isFinite(speed)||speed<SPEEDS[0]-EPS||speed>SPEEDS.at(-1)+EPS){
    return Object.freeze({applicable:true,state:"SOURCE_SPEED_OUT_OF_DOMAIN",numericEffectApplied:false,modifier:null,reference:ref});
  }
  const relative=current/expected-1;
  if(relative < -0.10-EPS || relative > 0.10+EPS){
    return Object.freeze({applicable:true,state:"SOURCE_RELATIVE_CADENCE_OUT_OF_HULL",numericEffectApplied:false,modifier:null,relativeCadenceDelta:relative,reference:ref});
  }
  const habitual=interp(SPEEDS,HABITUAL,speed), decreased=interp(SPEEDS,DECREASED,speed), increased=interp(SPEEDS,INCREASED,speed);
  if(!(habitual>0&&decreased>0&&increased>0))return Object.freeze({applicable:true,state:"SOURCE_RELATION_UNAVAILABLE",numericEffectApplied:false,modifier:null,reference:ref});
  let sourceValue;
  if(relative>=0)sourceValue=habitual+(increased-habitual)*(relative/0.10);
  else sourceValue=habitual+(decreased-habitual)*((-relative)/0.10);
  const modifier=sourceValue/habitual;
  return Object.freeze({
    applicable:true,state:"PROVISIONAL_APPLIED",numericEffectApplied:Math.abs(relative)>EPS,modifier,
    relativeCadenceDelta:relative,expectedCadenceSpm:expected,currentCadenceSpm:current,speedMps:speed,
    sourceId:A9_V25R1_CADENCE_SOURCE_ID,sourceRelation:"HAGEN_2023_RELATIVE_TO_HABITUAL_AT_SAME_SPEED",
    sourceRelativeHull:Object.freeze([-0.10,0.10]),sourceSpeedDomainMps:Object.freeze([SPEEDS[0],SPEEDS.at(-1)]),
    reference:ref,
  });
}
export function applyV25R1CadenceModifier(base, regionId, context={}){
  if(!base)return null;
  const cadence=evaluateV25R1CadenceModifier(regionId,context);
  if(!cadence.numericEffectApplied)return {...base,a9Cadence:cadence};
  const modifier=Number(cadence.modifier);
  return {
    ...base,
    ratio:Number(base.ratio)*modifier,
    routes:[...(base.routes||[]),"V25R1-CADENCE-BA019-PROVISIONAL"],
    sources:[...new Set([...(base.sources||[]),A9_V25R1_CADENCE_SOURCE_ID])],
    trace:[...(base.trace||[]),{traceCode:"V25R1_PERSONAL_HABITUAL_CADENCE_PROVISIONAL",message:"Applies the Hagen 2023 same-speed relative cadence relation only after a robust personal habitual cadence reference is reconstructed.",numericEffectApplied:true}],
    a9SupportTier:"PROVISIONAL_AUTHORIZED",
    a9UncertaintyClass:[...new Set([...(Array.isArray(base.a9UncertaintyClass)?base.a9UncertaintyClass:[base.a9UncertaintyClass].filter(Boolean)),"PERSONAL_HABITUAL_CADENCE_RECONSTRUCTED_PROVISIONAL"])].join("+")||null,
    a9Cadence:cadence,
  };
}
