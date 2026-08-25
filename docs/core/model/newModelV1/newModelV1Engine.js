// RunLoad New Model V1 numerical engine.
// Scientific authority: Phase 2B/3B/3C checkpoints, 2026-08-23.
export const NEW_MODEL_V1_MODEL_VERSION = "runload-new-model-v1.0";
export const NEW_MODEL_V1_OUTPUT_SEMANTIC_VERSION = "runload-new-model-output-semantics-v1.0";
export const NEW_MODEL_V1_AUTHORITY_VERSION = "RunLoad-NewModel-Authority-NM-AUTH-055-100";
export const NEW_MODEL_V1_ENGINE_BUILD = "runload-new-model-phase5-corrective-js-v1.0-c2";
export const NEW_MODEL_V1_DOMAIN_MIN_MPS = 2.25;
export const NEW_MODEL_V1_DOMAIN_MAX_MPS = 3.33;

export const NEW_MODEL_REGION_DEFS = Object.freeze([
  { id:"R01", displayId:"BA-DISP-014", name:"股関節部", referenceSpeedMps:2.50, construct:"股関節の機械的仕事に基づく部位内比較値", sourceIds:["FUKUCHI_2017"] },
  { id:"R02", displayId:"BA-DISP-015", name:"殿部", referenceSpeedMps:2.50, construct:"殿部筋活動に基づく部位内比較値", sourceIds:["GAZENDAM_HOF_2007"] },
  { id:"R03", displayId:"BA-DISP-016", name:"大腿前面", referenceSpeedMps:2.50, construct:"大腿前面筋活動に基づく部位内比較値", sourceIds:["GAZENDAM_HOF_2007"] },
  { id:"R04", displayId:"BA-DISP-018", name:"大腿後面", referenceSpeedMps:2.50, construct:"大腿後面筋活動に基づく部位内比較値", sourceIds:["GAZENDAM_HOF_2007"] },
  { id:"R05", displayId:"BA-DISP-019", name:"膝蓋大腿関節部", referenceSpeedMps:2.78, construct:"膝蓋大腿関節stress力積に基づく部位内比較値", sourceIds:["HAGEN_2023","VAN_HOOREN_2024"] },
  { id:"R06", displayId:"BA-DISP-021", name:"脛骨部", referenceSpeedMps:2.78, construct:"脛骨stress力積に基づく部位内比較値", sourceIds:["VAN_HOOREN_2024"] },
  { id:"R07", displayId:"BA-DISP-023", name:"下腿後面", referenceSpeedMps:2.50, construct:"下腿後面筋活動に基づく部位内比較値", sourceIds:["GAZENDAM_HOF_2007"] },
  { id:"R08", displayId:"BA-DISP-024", name:"足関節部", referenceSpeedMps:2.50, construct:"足関節の機械的仕事に基づく部位内比較値", sourceIds:["FUKUCHI_2017"] },
  { id:"R09", displayId:"BA-DISP-025", name:"アキレス腱部", referenceSpeedMps:2.78, construct:"アキレス腱strain力積に基づく部位内比較値", sourceIds:["VAN_HOOREN_2024"] },
  { id:"R10", displayId:"BA-DISP-027", name:"後足部", referenceSpeedMps:2.50, construct:"後足部ピーク足底圧に基づく部位内比較値", sourceIds:["HO_2010"] },
  { id:"R11", displayId:"BA-DISP-028", name:"足底中部・内側縦足弓", referenceSpeedMps:2.50, construct:"中足部ピーク足底圧に基づく部位内比較値", sourceIds:["HO_2010"] },
  { id:"R12", displayId:"BA-DISP-029", name:"前足部", referenceSpeedMps:2.50, construct:"前足部ピーク足底圧に基づく部位内比較値", sourceIds:["HO_2010"] },
]);

const DEF_BY_ID = new Map(NEW_MODEL_REGION_DEFS.map(x=>[x.id,x]));
const FF_AREA={1:9047,2:9256,3:4368,4:5311,5:2728,6:6518,7:5108,8:5893};
const COEFFS={
  SO:{1:[0.15,0.63,-0.24]}, GM:{1:[0.54,0.28,0]}, GL:{1:[0.06,1.11,-0.37]},
  VM:{2:[0.59,0,0]}, VL:{2:[0.46,0.17,0]}, RF:{2:[-0.17,0.64,0.018],3:[0.16,-0.37,0.50]},
  BF:{4:[0.68,-0.61,0.50],5:[-0.22,2.13,-1.14]}, ST:{4:[0.23,0.55,0],5:[-0.20,0.61,0]}, SM:{4:[0.32,0,0],5:[0.23,0,0]},
  GX:{6:[0,0.093,0],7:[0.046,0.13,0]}, GD:{6:[0.28,0,0],8:[0,0.29,0]}
};
const GROUPS={R02:["GX","GD"],R03:["VM","VL","RF"],R04:["BF","ST","SM"],R07:["SO","GM","GL"]};
const JOINT={
  R01:{pos:{2.5:0.80/1.86,3.5:1.49/2.46},neg:{2.5:0.27/1.86,3.5:0.42/2.46}},
  R08:{pos:{2.5:0.64/1.86,3.5:0.78/2.46},neg:{2.5:0.58/1.86,3.5:0.77/2.46}}
};
const R56={R06:{2.78:12424,3.00:11624,3.33:10551},R09:{2.78:439,3.00:413,3.33:374}};
const HO={He:{2.0:170.7,2.5:191.3},MM:{2.0:172.9,2.5:178.2},LM:{2.0:149.5,2.5:162.3},MF:{2.0:360.7,2.5:377.8},CF:{2.0:244.5,2.5:266.5},LF:{2.0:189.0,2.5:203.9}};
const HO_REGIONS={R10:["He"],R11:["MM","LM"],R12:["MF","CF","LF"]};
const TISSUE_SPEED={R05:{2.78:787,3.00:742,3.33:697},R06:{2.78:12424,3.00:11624,3.33:10551},R09:{2.78:439,3.00:413,3.33:374}};
const GRADE_SLOPES={R05:{downhill:-29.3,uphill:-14.0},R06:{downhill:-142.0,uphill:125.0},R09:{downhill:19.1,uphill:28.7}};
const CADENCE_SLOPES={R05:-1.21,R09:-1.54};
export const NEW_MODEL_CADENCE_REFERENCE_SPM=10/0.06;
export const NEW_MODEL_CADENCE_MIN_SPM=NEW_MODEL_CADENCE_REFERENCE_SPM-10;
export const NEW_MODEL_CADENCE_MAX_SPM=NEW_MODEL_CADENCE_REFERENCE_SPM+10;
export const NEW_MODEL_GRADE_MAX_PERCENT=Math.tan(6*Math.PI/180)*100;
export const NEW_MODEL_SURFACE_SPEED_MIN_MPS=(12*0.95)/3.6;
export const NEW_MODEL_SURFACE_SPEED_MAX_MPS=3.33;
export const NEW_MODEL_GRASS_FACTOR_R10=0.8696483764766398;
export const NEW_MODEL_GRASS_FACTOR_R12=0.9403566306575692;

function finite(v){return typeof v==="number"&&Number.isFinite(v);}
function linear(x,x0,y0,x1,y1){return y0+(y1-y0)*(x-x0)/(x1-x0);}
function interp(knots,x){const xs=Object.keys(knots).map(Number).sort((a,b)=>a-b);let x0,x1;if(x<=xs[0]){x0=xs[0];x1=xs[1];}else if(x>=xs.at(-1)){x0=xs.at(-2);x1=xs.at(-1);}else{for(let i=0;i<xs.length-1;i++){if(x>=xs[i]&&x<=xs[i+1]){x0=xs[i];x1=xs[i+1];break;}}}return linear(x,x0,knots[x0],x1,knots[x1]);}
function vhat(v){return v/Math.sqrt(9.81*0.99);}
function gain(v,c){const [d0,d1,d2]=c,q=vhat(v);return d0+d1*q+d2*q*q;}
function muscleA(v,m){return Object.entries(COEFFS[m]).reduce((s,[k,c])=>s+FF_AREA[Number(k)]*gain(v,c),0);}
function muscleRatio(v,m){return (muscleA(v,m)/v)/(muscleA(2.5,m)/2.5);}
function emgKnot(v,rid){const ms=GROUPS[rid];return ms.reduce((s,m)=>s+muscleRatio(v,m),0)/ms.length;}
const EMG_KNOTS=Object.fromEntries(Object.keys(GROUPS).map(rid=>[rid,Object.fromEntries([2.25,2.5,3.0,3.5].map(v=>[v,emgKnot(v,rid)]))]));

export function newModelV1SpeedResponse(rid,v){
  if(rid==="R01"||rid==="R08"){const vals=Object.values(JOINT[rid]).map(comp=>interp(comp,v)/comp[2.5]);return vals.reduce((a,b)=>a+b,0)/vals.length;}
  if(GROUPS[rid]) return interp(EMG_KNOTS[rid],v);
  if(rid==="R05"){const y=796.25-31.17*(v*3.6), yr=796.25-31.17*(2.78*3.6);return y/yr;}
  if(rid==="R06"||rid==="R09") return interp(R56[rid],v)/R56[rid][2.78];
  if(HO_REGIONS[rid]){const vals=HO_REGIONS[rid].map(mask=>interp(HO[mask],v)/HO[mask][2.5]);return vals.reduce((a,b)=>a+b,0)/vals.length;}
  throw new Error(`Unknown region ${rid}`);
}

function baselineProvenance(rid,v){if((rid==="R01"||rid==="R08")&&v<2.5)return "BOUNDED_PROVISIONAL";if((rid==="R06"||rid==="R09")&&v<2.78)return "BOUNDED_PROVISIONAL";if(HO_REGIONS[rid]&&v>2.5)return "BOUNDED_PROVISIONAL";return "SOURCE_BOUNDED_LINE";}

export function calculateNewModelV1Baseline(distanceKm,durationMinutes){
  const d=Number(distanceKm),t=Number(durationMinutes);if(!(d>0)||!(t>0))return {state:"INVALID_REQUIRED_FACT"};
  const v=d*1000/(t*60);if(v<NEW_MODEL_V1_DOMAIN_MIN_MPS-1e-12||v>NEW_MODEL_V1_DOMAIN_MAX_MPS+1e-12)return {state:"BASELINE_OOD",speed_mps:v,model_version:NEW_MODEL_V1_MODEL_VERSION};
  const values={},provenance={};for(const def of NEW_MODEL_REGION_DEFS){values[def.id]=100*d*newModelV1SpeedResponse(def.id,v);provenance[def.id]=baselineProvenance(def.id,v);}
  return {state:"OK",speed_mps:v,values,provenance,model_version:NEW_MODEL_V1_MODEL_VERSION};
}

function gradePctToDeg(pct,sign=1){return sign*Math.atan(Number(pct)/100)*180/Math.PI;}
function gradeValid(g){if(!g||typeof g!=="object")return false;const vals=[g.uphill_share_percent,g.downhill_share_percent,g.uphill_grade_percent,g.downhill_grade_percent].map(Number);if(vals.some(x=>!Number.isFinite(x)))return false;const [u,d,gu,gd]=vals;return u>=0&&d>=0&&u+d<=100+1e-9&&gu>=0&&gd>=0&&gu<=NEW_MODEL_GRADE_MAX_PERCENT+1e-9&&gd<=NEW_MODEL_GRADE_MAX_PERCENT+1e-9;}
function gradeDelta(rid,g){const up=gradePctToDeg(g.uphill_grade_percent,1),down=gradePctToDeg(g.downhill_grade_percent,-1);return (Number(g.uphill_share_percent)/100)*GRADE_SLOPES[rid].uphill*up+(Number(g.downhill_share_percent)/100)*GRADE_SLOPES[rid].downhill*down;}
function tissueFactor(rid,v,g,cadence){const y0=interp(TISSUE_SPEED[rid],v);let delta=0;const components=[];if(g){delta+=gradeDelta(rid,g);components.push("GRADE");}if(cadence!=null&&CADENCE_SLOPES[rid]!=null){delta+=CADENCE_SLOPES[rid]*(Number(cadence)-NEW_MODEL_CADENCE_REFERENCE_SPM);components.push("CADENCE");}return {factor:(y0+delta)/y0,components};}

function normalizeGradeSummary(raw){if(!raw)return null;return {uphill_share_percent:Number(raw.uphill_share_percent??0),downhill_share_percent:Number(raw.downhill_share_percent??0),uphill_grade_percent:Number(raw.uphill_grade_percent??0),downhill_grade_percent:Number(raw.downhill_grade_percent??0)};}
function surfaceValid(components){return Array.isArray(components)&&components.length>0&&Math.abs(components.reduce((s,c)=>s+Number(c.share_percent??c.sharePercent??0),0)-100)<=1e-6&&components.every(c=>["ASPHALT","CONCRETE","RUBBER_TRACK","NATURAL_GRASS"].includes(String(c.category||"").toUpperCase()));}
function surfaceFactor(rid,components){const grass=components.filter(c=>String(c.category||"").toUpperCase()==="NATURAL_GRASS").reduce((s,c)=>s+Number(c.share_percent??c.sharePercent??0),0)/100;if(!(grass>0))return {factor:1,changed:false};const direct=rid==="R10"?NEW_MODEL_GRASS_FACTOR_R10:rid==="R12"?NEW_MODEL_GRASS_FACTOR_R12:1;return {factor:1+grass*(direct-1),changed:(rid==="R10"||rid==="R12")};}

export function calculateNewModelV1({distanceKm,durationMinutes,gradeSummary=null,cadenceSpm=null,surfaceComponents=null}={}){
  const baseline=calculateNewModelV1Baseline(distanceKm,durationMinutes);if(baseline.state!=="OK")return baseline;
  const result=JSON.parse(JSON.stringify(baseline));const v=result.speed_mps;const optional_applied=[],fallback=[];
  const g=normalizeGradeSummary(gradeSummary), gv=g?gradeValid(g):false;if(g&&!gv)fallback.push("GRADE_INPUT_OOD_OR_INCOMPLETE_BASELINE_RECOVERY");
  const cv=cadenceSpm==null?false:Number.isFinite(Number(cadenceSpm))&&Number(cadenceSpm)>=NEW_MODEL_CADENCE_MIN_SPM-1e-9&&Number(cadenceSpm)<=NEW_MODEL_CADENCE_MAX_SPM+1e-9;if(cadenceSpm!=null&&!cv)fallback.push("CADENCE_OOD_BASELINE_RECOVERY");
  const tv=v>=2.78-1e-12&&v<=3.33+1e-12;if((gv||cv)&&!tv){if(gv)fallback.push("GRADE_SPEED_OOD_BASELINE_RECOVERY");if(cv)fallback.push("CADENCE_SPEED_OOD_BASELINE_RECOVERY");}
  if(tv&&(gv||cv)){for(const rid of ["R05","R06","R09"]){const useG=gv?g:null,useC=cv&&CADENCE_SLOPES[rid]!=null?Number(cadenceSpm):null;if(!useG&&useC==null)continue;const {factor,components}=tissueFactor(rid,v,useG,useC);result.values[rid]*=factor;result.provenance[rid]+="+TISSUE_CONDITION";optional_applied.push({region:rid,module:"OPT-TISSUE-CONDITION",components,factor,sourceIds:["VAN_HOOREN_2024"]});}if(cv)fallback.push("R06_CADENCE_EVIDENCE_INSUFFICIENT_BASELINE_RECOVERY");}
  const sv=surfaceComponents?surfaceValid(surfaceComponents):false;if(surfaceComponents&&!sv)fallback.push("SURFACE_INPUT_UNMAPPED_OR_INCOMPLETE_BASELINE_RECOVERY");const ss=v>=NEW_MODEL_SURFACE_SPEED_MIN_MPS-1e-12&&v<=NEW_MODEL_SURFACE_SPEED_MAX_MPS+1e-12;if(sv&&!ss)fallback.push("SURFACE_SPEED_OOD_BASELINE_RECOVERY");if(sv&&ss){for(const rid of ["R10","R12"]){const {factor,changed}=surfaceFactor(rid,surfaceComponents);if(changed){result.values[rid]*=factor;result.provenance[rid]+="+SURFACE_NATURAL_GRASS";optional_applied.push({region:rid,module:"OPT-SURFACE",factor,sourceIds:["TESSUTTI_2012"]});}}fallback.push("R11_SURFACE_DISTINCT_EFFECT_NOT_SUPPORTED_BASELINE_RECOVERY");}
  result.optional_applied=optional_applied;result.fallback=fallback;result.model_version=NEW_MODEL_V1_MODEL_VERSION;return result;
}

export function validateNewModelV1Calculation(result){
  const issues=[];if(!result||typeof result!=="object")return {valid:false,issues:["RESULT_OBJECT_REQUIRED"]};if(result.state!=="OK")return {valid:false,issues:[`STATE_${result.state||"UNKNOWN"}`]};
  for(const def of NEW_MODEL_REGION_DEFS){const v=result.values?.[def.id];if(!finite(v)||v<=0)issues.push(`REGION_VALUE_INVALID:${def.id}`);if(!result.provenance?.[def.id])issues.push(`PROVENANCE_MISSING:${def.id}`);}return {valid:issues.length===0,issues};
}

export function regionDefinition(regionIdOrDisplayId){return NEW_MODEL_REGION_DEFS.find(x=>x.id===regionIdOrDisplayId||x.displayId===regionIdOrDisplayId)||null;}
