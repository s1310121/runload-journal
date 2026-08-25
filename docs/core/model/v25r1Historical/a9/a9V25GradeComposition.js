const EPS=1e-9;
const pctFromDeg=d=>Math.tan(d*Math.PI/180)*100;
const degFromPct=p=>Math.atan(p/100)*180/Math.PI;
const gm=(a,b)=>Math.sqrt(a*b);
const H6=pctFromDeg(6);

export const A9_V25R1_GRADE_COMPOSITION_VERSION='RunLoad-V2.5R1-grade-composition-v1.0';

const CURVES=Object.freeze({
  'BA-DISP-014':Object.freeze({sourceId:'NUCKOLS2020_HIP_TOTAL_ABS_POWER',coord:'PERCENT',knots:[-10,-5,0,5,10],ratios:[1.12/1.17,1.20/1.17,1,1.55/1.17,1.84/1.17]}),
  'BA-DISP-016':Object.freeze({sourceId:'NUCKOLS2020_KNEE_NEG_POWER_MAG',coord:'PERCENT',knots:[-10,-5,0,5,10],ratios:[2.40/1.83,1.98/1.83,1,1.57/1.83,1.52/1.83]}),
  'BA-DISP-019':Object.freeze({sourceId:'VAN_HOOREN2024_PFJ_CUMULATIVE_GRADE',coord:'DEGREES',knots:[-6,-3,0,3,6],ratios:[1.222363,1.080051,1,.931385,.893266]}),
  'BA-DISP-021':Object.freeze({sourceId:'VAN_HOOREN2024_TIBIAL_CUMULATIVE_GRADE',coord:'DEGREES',knots:[-6,-3,0,3,6],ratios:[1.068496,.998149,1,1.010383,1.060126]}),
  'BA-DISP-024':Object.freeze({sourceId:'NUCKOLS2020_ANKLE_TOTAL_ABS_POWER',coord:'PERCENT',knots:[-10,-5,0,5,10],ratios:[2.40/3.14,2.52/3.14,1,3.19/3.14,3.18/3.14]}),
  'BA-DISP-025':Object.freeze({sourceId:'VAN_HOOREN2024_ACHILLES_CUMULATIVE_GRADE',coord:'DEGREES',knots:[-6,-3,0,3,6],ratios:[.738041,.835991,1,1.175399,1.3918]}),
  'BA-DISP-027':Object.freeze({sourceId:'HORIGUCHI2025_STRIKE_MARGINAL_HEEL_PEAK_PRESSURE',coord:'PERCENT',knots:[-H6,0,H6],ratios:[gm(371/280.8,99.9/72.1),1,gm(212.5/280.8,41.4/72.1)]}),
  'BA-DISP-028':Object.freeze({sourceId:'HORIGUCHI2025_STRIKE_MARGINAL_MIDFOOT_PEAK_PRESSURE',coord:'PERCENT',knots:[-H6,0,H6],ratios:[gm(170.3/158.0,158.8/168.0),1,gm(152.5/158.0,149.8/168.0)]}),
  'BA-DISP-029':Object.freeze({sourceId:'HORIGUCHI2025_STRIKE_MARGINAL_FOREFOOT_PEAK_PRESSURE',coord:'PERCENT',knots:[-H6,0,H6],ratios:[gm(329.1/375.7,504.7/524.9),1,gm(370.1/375.7,528.2/524.9)]}),
});
const ENV_CURVES=Object.freeze({
  'BA-DISP-018':Object.freeze({
    TREADMILL:Object.freeze({sourceId:'ROUSSOS2019_BF_TREADMILL',coord:'PERCENT',knots:[-8,-4,0,4,8],ratios:[73.69/66.15,61.98/66.15,1,69.66/66.15,83.32/66.15]}),
    OUTDOOR:Object.freeze({sourceId:'ROUSSOS2019_BF_OVERGROUND',coord:'PERCENT',knots:[-8,-4,0,4,8],ratios:[78.91/78.49,75.37/78.49,1,81.20/78.49,79.59/78.49]}),
  }),
  'BA-DISP-023':Object.freeze({
    TREADMILL:Object.freeze({sourceId:'ROUSSOS2019_GAS_TREADMILL',coord:'PERCENT',knots:[-8,-4,0,4,8],ratios:[89.72/75.36,57.15/75.36,1,75.68/75.36,93.20/75.36]}),
    OUTDOOR:Object.freeze({sourceId:'ROUSSOS2019_GAS_OVERGROUND',coord:'PERCENT',knots:[-8,-4,0,4,8],ratios:[91.61/92.84,90.64/92.84,1,86.70/92.84,93.21/92.84]}),
  }),
});
const UNQUANTIFIED=Object.freeze({
  'BA-DISP-015':Object.freeze({sourceId:'AHN2007_GMAX_DIRECTION_ONLY',disposition:'UNQUANTIFIED_CONTEXTUAL'}),
});

function curveFor(regionId,context={}){
  if(ENV_CURVES[regionId]) return ENV_CURVES[regionId][context.runSetting==='TREADMILL'?'TREADMILL':'OUTDOOR']??null;
  return CURVES[regionId]??null;
}
function linearHold(xs,ys,x){
  if(x<=xs[0]+EPS)return {ratio:ys[0],state:x<xs[0]-EPS?'CAPPED_BOUNDARY_HOLD':'EXACT_OR_IN_SOURCE'};
  if(x>=xs.at(-1)-EPS)return {ratio:ys.at(-1),state:x>xs.at(-1)+EPS?'CAPPED_BOUNDARY_HOLD':'EXACT_OR_IN_SOURCE'};
  for(let i=0;i<xs.length;i++)if(Math.abs(x-xs[i])<=EPS)return {ratio:ys[i],state:'EXACT_OR_IN_SOURCE'};
  for(let i=0;i<xs.length-1;i++)if(x>xs[i]&&x<xs[i+1]){const t=(x-xs[i])/(xs[i+1]-xs[i]);return {ratio:ys[i]+t*(ys[i+1]-ys[i]),state:'IN_SOURCE_INTERPOLATION'};}
  return null;
}

export function evaluateV25R1GradeModifier(regionId,context={}){
  if(context?.gait!=='RUN')return null;
  const grade=Number(context.gradePercent);
  if(!Number.isFinite(grade)||Math.abs(grade)>15+EPS)return null;
  if(Math.abs(grade)<=EPS)return Object.freeze({
    gradePercent:grade,numericGradeMainEffectApplied:false,gradeModifierRatio:null,
    gradeDisposition:'BASE_REFERENCE',sourceIds:[],contextSourceIds:[],uncertaintyClass:null,
    geometry:'LEVEL_REFERENCE',wholeRunSpeedUsedAsSectionSpeed:false,
  });
  if(UNQUANTIFIED[regionId])return Object.freeze({
    gradePercent:grade,numericGradeMainEffectApplied:false,gradeModifierRatio:null,
    gradeDisposition:UNQUANTIFIED[regionId].disposition,sourceIds:[],contextSourceIds:[UNQUANTIFIED[regionId].sourceId],
    uncertaintyClass:'GRADE_MAGNITUDE_UNQUANTIFIED',geometry:'DIRECTIONAL_CONTEXT_ONLY',wholeRunSpeedUsedAsSectionSpeed:false,
  });
  const curve=curveFor(regionId,context); if(!curve)return Object.freeze({
    gradePercent:grade,numericGradeMainEffectApplied:false,gradeModifierRatio:null,
    gradeDisposition:'UNQUANTIFIED_CONTEXTUAL',sourceIds:[],contextSourceIds:[],uncertaintyClass:'GRADE_MAGNITUDE_UNQUANTIFIED',geometry:'NO_AUTHORIZED_NUMERIC_GRADE_MODIFIER',wholeRunSpeedUsedAsSectionSpeed:false,
  });
  const sourceCoordinate=curve.coord==='DEGREES'?degFromPct(grade):grade;
  const ev=linearHold(curve.knots,curve.ratios,sourceCoordinate);
  if(!ev||!Number.isFinite(ev.ratio)||ev.ratio<=0)return null;
  return Object.freeze({
    gradePercent:grade,numericGradeMainEffectApplied:true,gradeModifierRatio:ev.ratio,
    gradeDisposition:'NUMERIC_PROVISIONAL',sourceIds:[curve.sourceId],contextSourceIds:[],
    uncertaintyClass:ev.state==='CAPPED_BOUNDARY_HOLD'?'BOUNDED_GRADE_SHAPE_BOUNDARY_HOLD':'CROSS_SOURCE_GRADE_SHAPE_PROVISIONAL',
    geometry:ev.state,sourceCoordinate,sourceCoordinateUnit:curve.coord,
    wholeRunSpeedUsedAsSectionSpeed:false,
  });
}

export function applyV25R1GradeModifier(baseResult,regionId,context={},meta={}){
  if(!baseResult||!Number.isFinite(baseResult.ratio)||baseResult.ratio<=0)return null;
  const grade=evaluateV25R1GradeModifier(regionId,context); if(!grade)return null;
  const ratio=grade.numericGradeMainEffectApplied?baseResult.ratio*grade.gradeModifierRatio:baseResult.ratio;
  const sources=[...new Set([...(baseResult.sources??[]),...(grade.numericGradeMainEffectApplied?grade.sourceIds:[])])];
  const contextSources=[...new Set([...(baseResult.a9ContextSourceIds??[]),...(grade.contextSourceIds??[])])];
  const supportTier=grade.numericGradeMainEffectApplied?'PROVISIONAL_AUTHORIZED':baseResult.a9SupportTier;
  const uncertainty=[baseResult.a9UncertaintyClass,grade.uncertaintyClass].filter(Boolean).join('|')||null;
  const routeId=`V25R1-CANONICAL-GRADE-${regionId}`;
  return {
    ...baseResult,ratio,routes:[routeId],sources,
    trace:[...(baseResult.trace??[]),
      grade.numericGradeMainEffectApplied
        ?{traceCode:'V25R1_GRADE_MODIFIER_APPLIED',message:'Applies an evidence-governed dimensionless grade modifier on the same canonical region coordinate.',numericEffectApplied:true}
        :{traceCode:'V25R1_GRADE_EFFECT_UNQUANTIFIED',message:'Grade is retained in provenance, but no independent numeric grade magnitude is authorized for this region.',numericEffectApplied:false},
      {traceCode:'WHOLE_RUN_SPEED_NOT_USED_AS_SECTION_SPEED',message:'Whole-record speed is not copied into an unknown section-speed field.',numericEffectApplied:false},
    ],
    evidenceRange:{...(baseResult.evidenceRange??{}),gradeComposition:{...grade,recordLevelCanonicalSpeedUsed:Boolean(meta.recordLevelCanonicalSpeedUsed),wholeRunSpeedUsedAsSectionSpeed:false}},
    a9SupportTier:supportTier,
    a9RouteSignature:`${baseResult.a9CanonicalFamilyId??regionId}|GRADE_COMPOSITION|V25R1`,
    a9UncertaintyClass:uncertainty,
    a9SourceLayer:'V25R1_CANONICAL_PLUS_GRADE',
    a9GradeDisposition:grade.gradeDisposition,
    a9GradeModifier:{...grade,recordLevelCanonicalSpeedUsed:Boolean(meta.recordLevelCanonicalSpeedUsed),wholeRunSpeedUsedAsSectionSpeed:false},
    a9ContextSourceIds:contextSources,
  };
}
