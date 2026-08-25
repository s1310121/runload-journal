// A6 candidate-only evidence range resolver.
// This module classifies evidence geometry; it does not create new magnitudes.

export const RANGE_STATES = Object.freeze({
  SOURCE_KNOT: "SOURCE_KNOT",
  WITHIN_SOURCE_INTERPOLATION: "WITHIN_SOURCE_INTERPOLATION",
  PUBLISHED_CONTINUOUS_MODEL: "PUBLISHED_CONTINUOUS_MODEL",
  MULTISOURCE_BOUNDED_TRANSFER: "MULTISOURCE_BOUNDED_TRANSFER",
  CATEGORICAL_MATCH: "CATEGORICAL_MATCH",
  AGGREGATION_WEIGHT: "AGGREGATION_WEIGHT",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  EVIDENCE_GAP: "EVIDENCE_GAP",
  PROHIBITED_NUMERIC: "PROHIBITED_NUMERIC",
});

const EPS = 1e-12;

function finiteSortedUnique(values){
  return [...new Set((values??[]).filter(Number.isFinite))].sort((a,b)=>a-b);
}

export function resolve1DKnots(values, x, {axis="value", epsilon=EPS}={}){
  const knots=finiteSortedUnique(values);
  if(!Number.isFinite(x)||knots.length===0){
    return {state:RANGE_STATES.EVIDENCE_GAP,axis,value:x,knots,reason:"MISSING_NUMERIC_COORDINATE_OR_KNOTS"};
  }
  const exactIndex=knots.findIndex(k=>Math.abs(k-x)<=epsilon);
  if(exactIndex>=0){
    return {state:RANGE_STATES.SOURCE_KNOT,axis,value:x,knotIndex:exactIndex,knot:knots[exactIndex],bracketingKnots:[knots[exactIndex],knots[exactIndex]],interpolationFraction:0};
  }
  if(x<knots[0]-epsilon||x>knots.at(-1)+epsilon){
    return {state:RANGE_STATES.OUT_OF_RANGE,axis,value:x,knots:[knots[0],knots.at(-1)],reason:"OUTSIDE_REGISTERED_KNOT_DOMAIN"};
  }
  for(let i=0;i<knots.length-1;i+=1){
    const lo=knots[i], hi=knots[i+1];
    if(x>lo&&x<hi){
      return {state:RANGE_STATES.WITHIN_SOURCE_INTERPOLATION,axis,value:x,lowerIndex:i,upperIndex:i+1,bracketingKnots:[lo,hi],interpolationFraction:(x-lo)/(hi-lo)};
    }
  }
  return {state:RANGE_STATES.EVIDENCE_GAP,axis,value:x,knots,reason:"UNRESOLVED_INTERVAL"};
}

export function resolveCategoricalMatch(value, allowedValues, {axis="category"}={}){
  const allowed=[...(allowedValues??[])];
  if(value==null||value==="")return {state:RANGE_STATES.EVIDENCE_GAP,axis,value,allowedValues:allowed,reason:"MISSING_CATEGORY"};
  return allowed.includes(value)
    ? {state:RANGE_STATES.CATEGORICAL_MATCH,axis,value,allowedValues:allowed}
    : {state:RANGE_STATES.OUT_OF_RANGE,axis,value,allowedValues:allowed,reason:"CATEGORY_NOT_IN_SOURCE_PROTOCOL"};
}

export function resolvePublishedContinuousModel(value, [min,max], {axis="value",modelId=null}={}){
  if(!Number.isFinite(value))return {state:RANGE_STATES.EVIDENCE_GAP,axis,value,domain:[min,max],modelId,reason:"MISSING_NUMERIC_COORDINATE"};
  if(value<min-EPS||value>max+EPS)return {state:RANGE_STATES.OUT_OF_RANGE,axis,value,domain:[min,max],modelId,reason:"OUTSIDE_PUBLISHED_MODEL_DOMAIN"};
  return {state:RANGE_STATES.PUBLISHED_CONTINUOUS_MODEL,axis,value,domain:[min,max],modelId};
}

export function resolveBoundedTransfer({value, domain, axis="value", envelopeId, sourceIds=[], reason=null}){
  if(!Array.isArray(domain)||domain.length!==2||!Number.isFinite(value))return {state:RANGE_STATES.EVIDENCE_GAP,axis,value,domain,envelopeId,sourceIds,reason:reason??"TRANSFER_COORDINATE_UNAVAILABLE"};
  const [min,max]=domain;
  if(value<min-EPS||value>max+EPS)return {state:RANGE_STATES.OUT_OF_RANGE,axis,value,domain:[min,max],envelopeId,sourceIds,reason:"OUTSIDE_TRANSFER_ENVELOPE"};
  return {state:RANGE_STATES.MULTISOURCE_BOUNDED_TRANSFER,axis,value,domain:[min,max],envelopeId,sourceIds,reason};
}

export function resolvePaired1DPath({x, y, xKnots, yKnots, yTolerance=0, xAxis="x", yAxis="y"}){
  if(!Number.isFinite(x)||!Number.isFinite(y)||xKnots?.length!==yKnots?.length||xKnots.length<2){
    return {state:RANGE_STATES.EVIDENCE_GAP,reason:"PAIRED_PATH_COORDINATES_UNAVAILABLE",coordinates:{[xAxis]:x,[yAxis]:y}};
  }
  const xState=resolve1DKnots(xKnots,x,{axis:xAxis});
  if(xState.state===RANGE_STATES.OUT_OF_RANGE||xState.state===RANGE_STATES.EVIDENCE_GAP)return xState;
  let expectedY;
  if(xState.state===RANGE_STATES.SOURCE_KNOT){
    expectedY=yKnots[xState.knotIndex];
  }else{
    const [i,j]=[xState.lowerIndex,xState.upperIndex];
    expectedY=yKnots[i]+(yKnots[j]-yKnots[i])*xState.interpolationFraction;
  }
  if(Math.abs(y-expectedY)>yTolerance+EPS){
    return {state:RANGE_STATES.OUT_OF_RANGE,reason:"OFF_PAIRED_SOURCE_PATH",coordinates:{[xAxis]:x,[yAxis]:y},expectedPairedCoordinate:{[yAxis]:expectedY},tolerance:yTolerance,bracketingKnots:xState.bracketingKnots};
  }
  const exactPair=xState.state===RANGE_STATES.SOURCE_KNOT&&Math.abs(y-expectedY)<=EPS;
  return {
    state:exactPair?RANGE_STATES.SOURCE_KNOT:RANGE_STATES.WITHIN_SOURCE_INTERPOLATION,
    geometry:"PAIRED_1D_PATH_IN_2D",
    coordinates:{[xAxis]:x,[yAxis]:y},
    expectedPairedCoordinate:{[yAxis]:expectedY},
    tolerance:yTolerance,
    bracketingKnots:xState.bracketingKnots,
    interpolationFraction:xState.interpolationFraction??0,
  };
}

export function aggregationWeightMeta({declaredShareFraction, basis="SECTION_SHARE"}){
  if(!Number.isFinite(declaredShareFraction)||declaredShareFraction<0||declaredShareFraction>1){
    return {state:RANGE_STATES.OUT_OF_RANGE,basis,declaredShareFraction,reason:"INVALID_AGGREGATION_WEIGHT"};
  }
  return {state:RANGE_STATES.AGGREGATION_WEIGHT,basis,declaredShareFraction};
}

export function evidenceGap(reason, details={}){
  return {state:RANGE_STATES.EVIDENCE_GAP,reason,...details};
}
