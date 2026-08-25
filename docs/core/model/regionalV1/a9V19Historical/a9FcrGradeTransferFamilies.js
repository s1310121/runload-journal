const EPS=1e-9;
export const A9_FCR_GRADE_TRANSFER_VERSION="RunLoad-A9-FCR-grade-conditioned-P3-v1.0";

const pctFromDeg=d=>Math.tan(d*Math.PI/180)*100;
const degFromPct=p=>Math.atan(p/100)*180/Math.PI;
const gm=(a,b)=>Math.sqrt(a*b);
const H6=pctFromDeg(6);

const CURVES=Object.freeze({
 "BA-DISP-014":Object.freeze({env:"ALL",sourceId:"NUCKOLS2020_HIP_TOTAL_ABS_POWER",coord:"PERCENT",knots:[-10,-5,0,5,10],ratios:[1.12/1.17,1.20/1.17,1,1.55/1.17,1.84/1.17],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_GRADE_SHAPE_TRANSFER"}),
 "BA-DISP-016":Object.freeze({env:"ALL",sourceId:"NUCKOLS2020_KNEE_NEG_POWER_MAG",coord:"PERCENT",knots:[-10,-5,0,5,10],ratios:[2.40/1.83,1.98/1.83,1,1.57/1.83,1.52/1.83],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_GRADE_SHAPE_TRANSFER"}),
 "BA-DISP-019":Object.freeze({env:"ALL",sourceId:"VAN_HOOREN2024_PFJ_CUMULATIVE_GRADE",coord:"DEGREES",knots:[-6,-3,0,3,6],ratios:[1.222363,1.080051,1,.931385,.893266],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_GRADE_SHAPE_TRANSFER"}),
 "BA-DISP-021":Object.freeze({env:"ALL",sourceId:"VAN_HOOREN2024_TIBIAL_CUMULATIVE_GRADE",coord:"DEGREES",knots:[-6,-3,0,3,6],ratios:[1.068496,.998149,1,1.010383,1.060126],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_CROSS_CONSTRUCT_GRADE_SHAPE_TRANSFER",corroboration:["Rice et al. 2024"]}),
 "BA-DISP-024":Object.freeze({env:"ALL",sourceId:"NUCKOLS2020_ANKLE_TOTAL_ABS_POWER",coord:"PERCENT",knots:[-10,-5,0,5,10],ratios:[2.40/3.14,2.52/3.14,1,3.19/3.14,3.18/3.14],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_GRADE_SHAPE_TRANSFER"}),
 "BA-DISP-025":Object.freeze({env:"ALL",sourceId:"VAN_HOOREN2024_ACHILLES_CUMULATIVE_GRADE",coord:"DEGREES",knots:[-6,-3,0,3,6],ratios:[.738041,.835991,1,1.175399,1.3918],evidenceClass:"P3_NORMALIZED_GRADE_SHAPE_TRANSFER",uncertainty:"P3_HIGH_CROSS_CONSTRUCT_GRADE_SHAPE_TRANSFER"}),
 "BA-DISP-027":Object.freeze({env:"ALL",sourceId:"HORIGUCHI2025_STRIKE_MARGINAL_HEEL_PEAK_PRESSURE",coord:"PERCENT",knots:[-H6,0,H6],ratios:[gm(371/280.8,99.9/72.1),1,gm(212.5/280.8,41.4/72.1)],evidenceClass:"P3_PROJECT_DERIVED_STRIKE_MARGINAL_GRADE_SHAPE",uncertainty:"P3_HIGH_STRIKE_MARGINAL_GRADE_SHAPE"}),
 "BA-DISP-028":Object.freeze({env:"ALL",sourceId:"HORIGUCHI2025_STRIKE_MARGINAL_MIDFOOT_PEAK_PRESSURE",coord:"PERCENT",knots:[-H6,0,H6],ratios:[gm(170.3/158.0,158.8/168.0),1,gm(152.5/158.0,149.8/168.0)],evidenceClass:"P3_PROJECT_DERIVED_STRIKE_MARGINAL_GRADE_SHAPE",uncertainty:"P3_HIGH_STRIKE_MARGINAL_GRADE_SHAPE"}),
 "BA-DISP-029":Object.freeze({env:"ALL",sourceId:"HORIGUCHI2025_STRIKE_MARGINAL_FOREFOOT_PEAK_PRESSURE",coord:"PERCENT",knots:[-H6,0,H6],ratios:[gm(329.1/375.7,504.7/524.9),1,gm(370.1/375.7,528.2/524.9)],evidenceClass:"P3_PROJECT_DERIVED_STRIKE_MARGINAL_GRADE_SHAPE",uncertainty:"P3_HIGH_STRIKE_MARGINAL_GRADE_SHAPE"}),
});
const ENV_CURVES=Object.freeze({
 "BA-DISP-018":Object.freeze({
  TREADMILL:Object.freeze({sourceId:"ROUSSOS2019_BF_TREADMILL",coord:"PERCENT",knots:[-8,-4,0,4,8],ratios:[73.69/66.15,61.98/66.15,1,69.66/66.15,83.32/66.15],evidenceClass:"P3_ENV_SPECIFIC_EMG_GRADE_SHAPE",uncertainty:"P3_HIGH_EMG_GRADE_SHAPE"}),
  OUTDOOR:Object.freeze({sourceId:"ROUSSOS2019_BF_OVERGROUND",coord:"PERCENT",knots:[-8,-4,0,4,8],ratios:[78.91/78.49,75.37/78.49,1,81.20/78.49,79.59/78.49],evidenceClass:"P3_ENV_SPECIFIC_EMG_GRADE_SHAPE",uncertainty:"P3_HIGH_OVERGROUND_TO_SURFACE_EMG_SHAPE"}),
 }),
 "BA-DISP-023":Object.freeze({
  TREADMILL:Object.freeze({sourceId:"ROUSSOS2019_GAS_TREADMILL",coord:"PERCENT",knots:[-8,-4,0,4,8],ratios:[89.72/75.36,57.15/75.36,1,75.68/75.36,93.20/75.36],evidenceClass:"P3_ENV_SPECIFIC_EMG_GRADE_SHAPE",uncertainty:"P3_HIGH_EMG_GRADE_SHAPE"}),
  OUTDOOR:Object.freeze({sourceId:"ROUSSOS2019_GAS_OVERGROUND",coord:"PERCENT",knots:[-8,-4,0,4,8],ratios:[91.61/92.84,90.64/92.84,1,86.70/92.84,93.21/92.84],evidenceClass:"P3_ENV_SPECIFIC_EMG_GRADE_SHAPE",uncertainty:"P3_HIGH_OVERGROUND_TO_SURFACE_EMG_SHAPE"}),
 }),
});
const BA015=Object.freeze({sourceId:"AHN2007_GMAX_DIRECTION_ONLY",evidenceClass:"P3_GRADE_CONDITIONED_MAGNITUDE_UNQUANTIFIED",uncertainty:"P3_VERY_HIGH_GRADE_MAGNITUDE_UNQUANTIFIED"});

function fnv1a(text=""){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,"0");}
function curveFor(regionId,context={}){
 if(regionId==="BA-DISP-015")return BA015;
 if(ENV_CURVES[regionId])return ENV_CURVES[regionId][context.runSetting==="TREADMILL"?"TREADMILL":"OUTDOOR"]??null;
 return CURVES[regionId]??null;
}
function linearHold(xs,ys,x){
 if(x<=xs[0]+EPS)return {ratio:ys[0],state:x<xs[0]-EPS?"CAPPED_BOUNDARY_HOLD":"EXACT_OR_IN_SOURCE"};
 if(x>=xs.at(-1)-EPS)return {ratio:ys.at(-1),state:x>xs.at(-1)+EPS?"CAPPED_BOUNDARY_HOLD":"EXACT_OR_IN_SOURCE"};
 for(let i=0;i<xs.length;i++)if(Math.abs(x-xs[i])<=EPS)return {ratio:ys[i],state:"EXACT_OR_IN_SOURCE"};
 for(let i=0;i<xs.length-1;i++)if(x>xs[i]&&x<xs[i+1]){const t=(x-xs[i])/(xs[i+1]-xs[i]);return {ratio:ys[i]+t*(ys[i+1]-ys[i]),state:"IN_SOURCE_INTERPOLATION"};}
 return null;
}
export function evaluateA9FcrGradeConditionedProxy(regionId,context={},levelBaseResult=null,options={}){
 if(options.includeProvisional===false||context?.gait!=="RUN")return null;
 const gp=Number(context.gradePercent); if(!Number.isFinite(gp)||Math.abs(gp)>15+EPS)return null;
 if(Math.abs(gp)<=EPS&&!options.allowLevelProxy)return null;
 if(!levelBaseResult||!Number.isFinite(levelBaseResult.ratio)||levelBaseResult.ratio<=0||(levelBaseResult.routes?.length??0)===0)return null;
 const f=curveFor(regionId,context); if(!f)return null;
 const gradeQuantified=regionId!=="BA-DISP-015";
 let gradeRatio=1, shapeState=Math.abs(gp)<=EPS?"EXACT_LEVEL_REFERENCE":"MAGNITUDE_UNQUANTIFIED";
 let sourceCoordinate=gp;
 if(gradeQuantified){
  sourceCoordinate=f.coord==="DEGREES"?degFromPct(gp):gp;
  const ev=linearHold(f.knots,f.ratios,sourceCoordinate); if(!ev||!Number.isFinite(ev.ratio)||ev.ratio<=0)return null;
  gradeRatio=ev.ratio;shapeState=ev.state;
 }
 const baseSem=levelBaseResult.a9SemanticIdentity??{};
 const baseSig=String(levelBaseResult.a9RouteSignature??levelBaseResult.routes.join("+"));
 const baseRef=String(baseSem.referenceDefinitionId??`UNKNOWN_REF_${regionId}`);
 const baseConstruct=String(baseSem.constructId??`UNKNOWN_CONSTRUCT_${regionId}`);
 const keyHash=fnv1a(`${baseSig}|${f.sourceId}`);
 const constructId=`FCR_GRADE_CONDITIONED_SEPARABLE_PROXY__${regionId}__${fnv1a(baseConstruct)}__${fnv1a(f.sourceId)}`;
 const refId=`A9-FCR-GRADE-RDEF-${regionId}-${fnv1a(baseRef)}-${fnv1a(f.sourceId)}`;
 const routeId=`A9-FCR-GRADE-${regionId}-${keyHash}`;
 const ratio=levelBaseResult.ratio*gradeRatio;
 const sources=[...new Set([...(levelBaseResult.sources??[]),f.sourceId,...(f.corroboration??[])])];
 const missing=gradeQuantified?["FORMAL_SPEED_X_GRADE_INTERACTION_NOT_CLAIMED"]:["NUMERIC_GRADE_MAIN_EFFECT_UNQUANTIFIED","FORMAL_SPEED_X_GRADE_INTERACTION_NOT_CLAIMED"];
 return {ratio,state:"PARTIAL",routes:[routeId],interactions:[],sources,parameters:[],
  trace:[
   {traceCode:"A9_FCR_P3_GRADE_CONDITIONED_SEPARABLE_PROXY",message:"Combines the already-audited same-speed/same-surface level response with a separately identified regional grade-shape proxy; this is not a Formal speed×grade interaction model.",numericEffectApplied:true},
   gradeQuantified?{traceCode:shapeState==="CAPPED_BOUNDARY_HOLD"?"GRADE_SHAPE_CAPPED_OUTSIDE_SOURCE":"GRADE_SHAPE_WITHIN_SOURCE_COORDINATE",message:shapeState==="CAPPED_BOUNDARY_HOLD"?"The target grade lies outside the source's outer grade knot; the frozen provisional rule holds the outer normalized response rather than escalating an unobserved magnitude. This is not a biological plateau claim.":"The grade modifier is interpolated in the source's native coordinate from normalized within-source values.",numericEffectApplied:true}:{traceCode:"GRADE_MAIN_EFFECT_MAGNITUDE_UNQUANTIFIED",message:"The grade-specific magnitude is not defensibly quantified for this region. The audited speed/surface condition response is retained inside a grade-specific provisional identity; numeric equality does not mean zero grade effect.",numericEffectApplied:false},
   {traceCode:"NO_RAW_CROSS_SOURCE_MAGNITUDE_BLEND",message:"No raw force, stress, EMG, pressure or work magnitude is merged across incompatible source families.",numericEffectApplied:false}
  ],
  componentCoverage:{state:"PARTIAL",observedComponentIds:[constructId],missingComponentIds:missing,normalizedWeights:{[constructId]:1}},
  evidenceRange:{axis:"gradePercent",geometry:"P3_GRADE_CONDITIONED_SEPARABLE_PROXY",ruleId:"A9-FCR-GRADE-P3-V1",referenceDefinitionId:refId,evidenceClass:f.evidenceClass,supportTier:"PROVISIONAL_AUTHORIZED",targetGradePercent:gp,sourceCoordinate,sourceCoordinateUnit:f.coord??"PERCENT",gradeShapeState:shapeState,gradeMainEffectQuantified:gradeQuantified,gradeModifierRatio:gradeRatio,baseLevelReferenceDefinitionId:baseRef,baseLevelConstructId:baseConstruct,baseLevelRouteSignature:baseSig,rawMagnitudeBlended:false,formal2DInteractionClaimed:false},
  a9SemanticIdentity:{constructId,referenceDefinitionId:refId,evidenceClass:f.evidenceClass},a9SupportTier:"PROVISIONAL_AUTHORIZED",a9RouteSignature:`${regionId}|FCR_GRADE_P3|BASE_${fnv1a(baseSig)}|GRADE_${fnv1a(f.sourceId)}|V1`,a9UncertaintyClass:f.uncertainty,a9SourceLayer:"A9_FCR_GRADE_P3_PROXY",
  a9GradeTransfer:{gradeMainEffectQuantified:gradeQuantified,gradeModifierRatio:gradeRatio,sourceShapeId:f.sourceId,sourceCoordinate,sourceCoordinateUnit:f.coord??"PERCENT",shapeState,baseLevelRouteSignature:baseSig,formal2DInteractionClaimed:false,rawMagnitudeBlended:false}
 };
}
