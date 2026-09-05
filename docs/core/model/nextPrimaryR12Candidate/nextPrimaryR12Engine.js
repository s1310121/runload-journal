// RunLoad successor Primary candidate R12 V0.1
// Clean-room implementation basis: R6-R11 artifacts created after formal R6 handoff.
// IMPORTANT: This is an isolated candidate. It does not modify Current V2.8R1.

export const MODEL_VERSION = 'runload-next-primary-candidate-r12-v0.1';
export const OUTPUT_SEMANTIC_VERSION = 'runload-next-primary-output-semantics-candidate-v2.0';
export const BUILD_ID = 'r12-cleanroom-20260826-v0.1';

export const REGION_DEFS = Object.freeze([
  {id:'R01',name:'股関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'股関節の機械的仕事に基づく部位内比較値',baselineSource:'FUKUCHI_2017',exposureSemantic:'DISTANCE_SCALED_MECHANICAL_WORK_PER_DISTANCE'},
  {id:'R02',name:'殿部',referenceSpeedMps:2.50,domain:[2.25,3.33],construct:'殿部筋活動に基づく部位内比較値',baselineSource:'GAZENDAM_HOF_2007_FROZEN_CURRENT',exposureSemantic:'DISTANCE_SCALED_EMG_TIME_PER_DISTANCE'},
  {id:'R03',name:'大腿前面',referenceSpeedMps:2.50,domain:[2.25,3.33],construct:'大腿前面筋活動に基づく部位内比較値',baselineSource:'GAZENDAM_HOF_2007_FROZEN_CURRENT',exposureSemantic:'DISTANCE_SCALED_EMG_TIME_PER_DISTANCE'},
  {id:'R04',name:'大腿後面',referenceSpeedMps:2.50,domain:[2.25,3.33],construct:'大腿後面筋活動に基づく部位内比較値',baselineSource:'GAZENDAM_HOF_2007_FROZEN_CURRENT',exposureSemantic:'DISTANCE_SCALED_EMG_TIME_PER_DISTANCE'},
  {id:'R05',name:'膝蓋大腿関節部',referenceSpeedMps:2.78,domain:[8/3.6,16/3.6],construct:'膝蓋大腿関節stress力積に基づく部位内比較値',baselineSource:'HAGEN_2023',exposureSemantic:'SOURCE_CUMULATIVE_IMPULSE_PER_DISTANCE'},
  {id:'R06',name:'脛骨部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'脛骨stress力積に基づく部位内比較値',baselineSource:'VAN_HOOREN_2024',exposureSemantic:'SOURCE_CUMULATIVE_IMPULSE_PER_DISTANCE'},
  {id:'R07',name:'下腿後面',referenceSpeedMps:2.50,domain:[2.25,3.33],construct:'下腿後面筋活動に基づく部位内比較値',baselineSource:'GAZENDAM_HOF_2007_FROZEN_CURRENT',exposureSemantic:'DISTANCE_SCALED_EMG_TIME_PER_DISTANCE'},
  {id:'R08',name:'足関節部',referenceSpeedMps:2.50,domain:[2.50,4.50],construct:'足関節の機械的仕事に基づく部位内比較値',baselineSource:'FUKUCHI_2017',exposureSemantic:'DISTANCE_SCALED_MECHANICAL_WORK_PER_DISTANCE'},
  {id:'R09',name:'アキレス腱部',referenceSpeedMps:2.78,domain:[2.78,5.00],construct:'アキレス腱strain力積に基づく部位内比較値',baselineSource:'VAN_HOOREN_2024',exposureSemantic:'SOURCE_CUMULATIVE_IMPULSE_PER_DISTANCE'},
  {id:'R10',name:'後足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'後足部ピーク足底圧に基づく部位内比較値',baselineSource:'HO_2010',exposureSemantic:'MODEL_DERIVED_DISTANCE_EXPOSURE_PROXY'},
  {id:'R11',name:'足底中部・内側縦足弓',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'中足部ピーク足底圧に基づく部位内比較値',baselineSource:'HO_2010',exposureSemantic:'MODEL_DERIVED_DISTANCE_EXPOSURE_PROXY'},
  {id:'R12',name:'前足部',referenceSpeedMps:2.50,domain:[1.50,2.50],construct:'前足部ピーク足底圧に基づく部位内比較値',baselineSource:'HO_2010',exposureSemantic:'MODEL_DERIVED_DISTANCE_EXPOSURE_PROXY'},
]);
const DEF = new Map(REGION_DEFS.map(x=>[x.id,x]));

// Frozen Current inherited Gazendam representation. Reading Current comparator is allowed;
// these constants are explicitly NOT promoted as independently reproduced source constants.
const FF_AREA={1:9047,2:9256,3:4368,4:5311,5:2728,6:6518,7:5108,8:5893};
const EMG_COEFFS={
  SO:{1:[0.15,0.63,-0.24]}, GM:{1:[0.54,0.28,0]}, GL:{1:[0.06,1.11,-0.37]},
  VM:{2:[0.59,0,0]}, VL:{2:[0.46,0.17,0]}, RF:{2:[-0.17,0.64,0.018],3:[0.16,-0.37,0.50]},
  BF:{4:[0.68,-0.61,0.50],5:[-0.22,2.13,-1.14]}, ST:{4:[0.23,0.55,0],5:[-0.20,0.61,0]}, SM:{4:[0.32,0,0],5:[0.23,0,0]},
  GX:{6:[0,0.093,0],7:[0.046,0.13,0]}, GD:{6:[0.28,0,0],8:[0,0.29,0]}
};
const EMG_GROUPS={R02:['GX','GD'],R03:['VM','VL','RF'],R04:['BF','ST','SM'],R07:['SO','GM','GL']};

const FUKUCHI={
  R01:{pos:{2.5:0.80/1.86,3.5:1.49/2.46,4.5:2.43/2.96},neg:{2.5:0.27/1.86,3.5:0.42/2.46,4.5:0.66/2.96}},
  R08:{pos:{2.5:0.64/1.86,3.5:0.78/2.46,4.5:0.95/2.96},neg:{2.5:0.58/1.86,3.5:0.77/2.46,4.5:0.96/2.96}}
};
const VAN_SPEED={R06:{2.78:12424,3.00:11624,3.33:10551,4.00:9362,5.00:7802},R09:{2.78:439,3.00:413,3.33:374,4.00:325,5.00:266}};
const HO={He:{1.5:143.6,2.0:170.7,2.5:191.3},MM:{1.5:154.1,2.0:172.9,2.5:178.2},LM:{1.5:130.3,2.0:149.5,2.5:162.3},MF:{1.5:339.8,2.0:360.7,2.5:377.8},CF:{1.5:223.8,2.0:244.5,2.5:266.5},LF:{1.5:172.7,2.0:189.0,2.5:203.9}};
const HO_REGIONS={R10:['He'],R11:['MM','LM'],R12:['MF','CF','LF']};
const VH_GRADE={R05:{'-6':962,'-3':850,'0':787,'3':733,'6':703},R06:{'-6':13275,'-3':12401,'0':12424,'3':12553,'6':13171},R09:{'-6':324,'-3':367,'0':439,'3':516,'6':611}};
const R09_CAD={'-10':398,'0':374,'10':370};
const HO_HEEL_GRADE={'0':170.7,'5':161.4,'10':142.6,'15':124.1};
const HORIGUCHI={
  R10:{RFS:{'-6':371.0,'0':280.8,'6':212.5},FFS:{'-6':99.9,'0':72.1,'6':41.4}},
  R12:{RFS:{'-6':329.1,'0':375.7,'6':370.1},FFS:{'-6':504.7,'0':524.9,'6':528.2}}
};
const GRASS_R10=299.5/347.7;
export const R12_GRASS_ENVELOPE=[0.895910642027,0.914520670558];
const HAGEN_REL_DEC={8:-.08,10:-.07,12:-.06,14:-.06,16:-.05};
const HAGEN_REL_INC={8:.10,10:.11,12:.11,14:.11,16:.10};
const VERIFIED_PROVENANCE=new Set(['VIDEO_VERIFIED','DEVICE_VERIFIED','INSTRUMENT_VERIFIED','LAB_VERIFIED']);

function finite(x){return typeof x==='number'&&Number.isFinite(x)}
function near(a,b,t=1e-9){return Math.abs(a-b)<=t}
function sortedKeys(o){return Object.keys(o).map(Number).sort((a,b)=>a-b)}
function linear(x,x0,y0,x1,y1){return y0+(y1-y0)*(x-x0)/(x1-x0)}
function interp(o,x){
  const xs=sortedKeys(o); if(x<xs[0]-1e-12||x>xs.at(-1)+1e-12) return null;
  if(near(x,xs[0]))return Number(o[xs[0]]); if(near(x,xs.at(-1)))return Number(o[xs.at(-1)]);
  for(let i=0;i<xs.length-1;i++){if(x>=xs[i]-1e-12&&x<=xs[i+1]+1e-12)return linear(x,xs[i],Number(o[xs[i]]),xs[i+1],Number(o[xs[i+1]]));}
  return null;
}
function isKnot(o,x){return sortedKeys(o).some(k=>near(k,x))}
function vhat(v){return v/Math.sqrt(9.81*0.99)}
function gain(v,c){const [d0,d1,d2]=c,q=vhat(v);return d0+d1*q+d2*q*q}
function muscleA(v,m){return Object.entries(EMG_COEFFS[m]).reduce((s,[k,c])=>s+FF_AREA[Number(k)]*gain(v,c),0)}
function muscleRatio(v,m){return (muscleA(v,m)/v)/(muscleA(2.5,m)/2.5)}
function emgRaw(r,v){return EMG_GROUPS[r].reduce((s,m)=>s+muscleRatio(v,m),0)/EMG_GROUPS[r].length}
function hagH(s){return 796.25-31.17*s}
function hagD(s){return 908.84-36.86*s}
function hagI(s){return 635.35-22.36*s}
function interpCentroid(o,s){const xs=sortedKeys(o);if(s<xs[0]-1e-12||s>xs.at(-1)+1e-12)return null;return interp(o,s)}
function gradePctToDeg(p){return Math.atan(Number(p)/100)*180/Math.PI}

function rawBaselineInside(r,v){
  if(r==='R01'||r==='R08'){
    const fam=FUKUCHI[r]; const vals=['pos','neg'].map(k=>interp(fam[k],v)/fam[k][2.5]); return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  if(EMG_GROUPS[r]) return emgRaw(r,v);
  if(r==='R05') return hagH(v*3.6)/hagH(2.78*3.6);
  if(r==='R06'||r==='R09') return interp(VAN_SPEED[r],v)/VAN_SPEED[r][2.78];
  if(HO_REGIONS[r]) return HO_REGIONS[r].reduce((s,m)=>s+interp(HO[m],v)/HO[m][2.5],0)/HO_REGIONS[r].length;
  throw new Error('UNKNOWN_REGION');
}
function nearestInterior(r,b){
  if(r==='R01'||r==='R08') return b===2.5?3.5:3.5;
  if(r==='R05') return b<3?10/3.6:14/3.6;
  if(r==='R06'||r==='R09') return b===2.78?3.0:4.0;
  if(HO_REGIONS[r]) return 2.0;
  return null;
}
function boundaryLogSlope(r,b){
  if(r==='R05') return (-31.17*3.6)/hagH(b*3.6);
  const n=nearestInterior(r,b); const qb=rawBaselineInside(r,b), qn=rawBaselineInside(r,n);
  return (Math.log(qn)-Math.log(qb))/(n-b);
}
function provisionalBaseline(r,v){
  const d=DEF.get(r),[lo,hi]=d.domain,b=v<lo?lo:hi,qb=rawBaselineInside(r,b),L=hi-lo,m=boundaryLogSlope(r,b),delta=v-b,deff=L*Math.tanh(delta/L);
  return {ratio:qb*Math.exp(m*deff),evidenceState:'PROVISIONAL_GENERALITY_FALLBACK',sourceFamily:d.baselineSource,boundarySpeedMps:b,outsideDistanceMps:Math.abs(delta),outsideDomainSpans:Math.abs(delta)/L,provisionalAssumption:'BOUNDED_LOG_CONTINUATION_FULL_SOURCE_SPAN'};
}

export function baselineResponse(regionId,speedMps){
  const d=DEF.get(regionId),v=Number(speedMps); if(!d||!(v>0)) throw new Error('VALID_REGION_AND_POSITIVE_SPEED_REQUIRED');
  const [lo,hi]=d.domain;
  if(EMG_GROUPS[regionId]){
    if(v<lo-1e-12||v>hi+1e-12)return {ratio:null,evidenceState:'EVIDENCE_INSUFFICIENT',sourceFamily:d.baselineSource,flags:['FF_AREA_PROVENANCE_UNRESOLVED','NO_OUT_OF_DOMAIN_CONTINUATION']};
    return {ratio:rawBaselineInside(regionId,v),evidenceState:'PROVISIONAL_FROZEN_INHERITED_PATH',sourceFamily:d.baselineSource,flags:['FF_AREA_PROVENANCE_UNRESOLVED','MODEL_DERIVED_EMG_TIME_PER_DISTANCE']};
  }
  if(v<lo-1e-12||v>hi+1e-12)return provisionalBaseline(regionId,v);
  let state='SOURCE_BOUNDED_INTERPOLATION';
  if(regionId==='R05')state='SOURCE_DEFINED_MODEL';
  else if(regionId==='R01'||regionId==='R08')state=isKnot(FUKUCHI[regionId].pos,v)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION';
  else if(regionId==='R06'||regionId==='R09')state=isKnot(VAN_SPEED[regionId],v)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION';
  else if(HO_REGIONS[regionId])state=isKnot(HO[HO_REGIONS[regionId][0]],v)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION';
  return {ratio:rawBaselineInside(regionId,v),evidenceState:state,sourceFamily:d.baselineSource,flags:(regionId==='R01'||regionId==='R08')?['MODEL_DERIVED_COMPOSITE']:[]};
}

function normalizeStrike(obs){
  if(!obs||typeof obs!=='object')return null; const value=String(obs.value||'').toUpperCase(), provenance=String(obs.provenance||'').toUpperCase();
  if(!['RFS','FFS','MFS'].includes(value))return null; return {value,provenance,verified:VERIFIED_PROVENANCE.has(provenance)};
}
function weakest(states){
  const rank={DIRECT_KNOT:0,SOURCE_DEFINED_MODEL:0,SOURCE_BOUNDED_INTERPOLATION:1,BOUNDED_TRANSFER:2,PROVISIONAL_FROZEN_INHERITED_PATH:3,PROVISIONAL_SEPARABLE_COMPOSITION:4,PROVISIONAL_GENERALITY_FALLBACK:5,PROVISIONAL_COMPONENT_ENVELOPE:5,EVIDENCE_INSUFFICIENT:9};
  return states.reduce((w,s)=>rank[s]>rank[w]?s:w,states[0]||'DIRECT_KNOT');
}
function addComponent(trace,c){trace.components.push(c); if(c.evidenceState)trace.states.push(c.evidenceState)}

function r05CadenceJoint(speed,cadence,personalRef){
  if(!(finite(cadence)&&cadence>0&&finite(personalRef)&&personalRef>0))return {active:false,state:'REFERENCE_BUILDING'};
  const s=speed*3.6;if(s<8-1e-12||s>16+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT'};
  const lo=interpCentroid(HAGEN_REL_DEC,s),hi=interpCentroid(HAGEN_REL_INC,s),rel=cadence/personalRef-1;
  if(rel<lo-1e-12||rel>hi+1e-12)return {active:false,state:'EVIDENCE_INSUFFICIENT',relativeCadence:rel,sourceHull:[lo,hi]};
  const D=hagD(s),H=hagH(s),I=hagI(s); let raw;
  if(rel<=0)raw=linear(rel,lo,D,0,H); else raw=linear(rel,0,H,hi,I);
  return {active:true,ratio:raw/hagH(2.78*3.6),state:(near(rel,0)?'SOURCE_DEFINED_MODEL':'SOURCE_BOUNDED_INTERPOLATION'),relativeCadence:rel,sourceHull:[lo,hi],sourceFamily:'HAGEN_2023_SPEED_RELATIVE_CADENCE'};
}
function vhGradeRatio(r,gradeDeg){const raw=interp(VH_GRADE[r],gradeDeg);if(raw==null)return null;return raw/VH_GRADE[r]['0']}
function r09CadenceAbsolute(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/VAN_SPEED.R09[2.78]}
function r09CadenceRelative(delta){const raw=interp(R09_CAD,delta);return raw==null?null:raw/R09_CAD['0']}
function horiguchiRatio(r,strike,gradeDeg){const pts=HORIGUCHI[r]?.[strike];if(!pts)return null;const raw=interp(pts,gradeDeg);return raw==null?null:raw/pts['0']}
function isOverground(runSetting){const x=String(runSetting||'').toUpperCase();return x.includes('OUTDOOR')||x.includes('OVERGROUND')}
function grassShare(surfaceComponents){if(!Array.isArray(surfaceComponents))return 0;return surfaceComponents.filter(x=>String(x.category||x.userCategory||'').toUpperCase().includes('NATURAL_GRASS')).reduce((s,x)=>s+Number(x.sharePercent??x.share_percent??0),0)/100}

export function evaluateRegionSegment(regionId,{distanceKm,speedMps,gradePercent=null,cadenceSpm=null,personalHabitualCadenceSpm=null,surfaceComponents=null,runSetting=null,footStrikeObservation=null,allowR12GrassEnvelope=false}={}){
  const d=Number(distanceKm),v=Number(speedMps); if(!(d>=0&&v>0))return {regionId,state:'INVALID_SEGMENT_FACT'};
  const b=baselineResponse(regionId,v); const trace={baseline:b,components:[],states:[b.evidenceState],interactionState:'NO_UNRESOLVED_INTERACTION',unquantified:[]};
  if(b.ratio==null)return {regionId,state:'EVIDENCE_INSUFFICIENT',value:null,valueEnvelope:null,distanceKm:d,speedMps:v,trace};
  let q=b.ratio; let activeAxes=[]; let envelope=null;

  // R05 source-native joint speed×relative-cadence family.
  if(regionId==='R05'&&cadenceSpm!=null){
    const c=r05CadenceJoint(v,Number(cadenceSpm),Number(personalHabitualCadenceSpm));
    if(c.active){q=c.ratio;activeAxes.push('CADENCE');addComponent(trace,{axis:'CADENCE',sourceFamily:c.sourceFamily,evidenceState:c.state,relativeCadence:c.relativeCadence,sourceHull:c.sourceHull,jointWithSpeed:true});}
    else {trace.unquantified.push({axis:'CADENCE',state:c.state,reason:c.state==='REFERENCE_BUILDING'?'PERSONAL_REFERENCE_UNAVAILABLE':'OUTSIDE_HAGEN_SOURCE_HULL'});}
  } else if(regionId==='R09'&&cadenceSpm!=null){
    const pref=Number(personalHabitualCadenceSpm),cur=Number(cadenceSpm);
    if(finite(pref)&&pref>0&&finite(cur)&&cur>0){
      const delta=cur-pref;
      if(Math.abs(delta)<=10+1e-12&&near(v,3.33,1e-6)){
        const qa=r09CadenceAbsolute(delta); q=qa; activeAxes.push('CADENCE'); addComponent(trace,{axis:'CADENCE',sourceFamily:'VAN_HOOREN_2024_R09_CADENCE',evidenceState:isKnot(R09_CAD,delta)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION',deltaSpm:delta,jointWithSpeed:true});
      }else if(Math.abs(delta)<=10+1e-12&&v>=2.78-1e-12&&v<3.33-1e-6){
        q*=r09CadenceRelative(delta);activeAxes.push('CADENCE');trace.interactionState='INTERACTION_UNRESOLVED';addComponent(trace,{axis:'CADENCE',sourceFamily:'VAN_HOOREN_2024_R09_CADENCE',evidenceState:'PROVISIONAL_SEPARABLE_COMPOSITION',deltaSpm:delta,transferDimension:'speed'});
      }else trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'OUTSIDE_R09_CADENCE_GEOMETRY'});
    } else trace.unquantified.push({axis:'CADENCE',state:'REFERENCE_BUILDING',reason:'PERSONAL_REFERENCE_UNAVAILABLE'});
  } else if(regionId==='R06'&&cadenceSpm!=null){trace.unquantified.push({axis:'CADENCE',state:'EVIDENCE_INSUFFICIENT',reason:'R06_CADENCE_SLOPE_NOT_SUPPORTED'});}

  // Grade. Horiguchi verified joint family supersedes separate grade path for R10/R12.
  if(gradePercent!=null&&finite(Number(gradePercent))){
    const gp=Number(gradePercent), gd=gradePctToDeg(gp), strike=normalizeStrike(footStrikeObservation);
    let gradeHandled=false;
    if((regionId==='R10'||regionId==='R12')&&strike?.verified&&['RFS','FFS'].includes(strike.value)&&near(v,3.33,1e-6)&&Math.abs(gd)<=6+1e-12){
      const f=horiguchiRatio(regionId,strike.value,gd); if(f!=null){q*=f;activeAxes.push('GRADE_STRIKE');gradeHandled=true;addComponent(trace,{axis:'GRADE_STRIKE',sourceFamily:`HORIGUCHI_2025_${regionId}_${strike.value}`,evidenceState:'BOUNDED_TRANSFER',gradeDeg:gd,observationProvenance:strike.provenance,jointFamily:true});}
    }
    if(!gradeHandled&&['R05','R06','R09'].includes(regionId)&&Math.abs(gd)<=6+1e-12){
      const f=vhGradeRatio(regionId,gd);
      if(regionId==='R06'||regionId==='R09'){
        if(near(v,2.78,1e-6)&&!activeAxes.includes('CADENCE')){q=interp(VH_GRADE[regionId],gd)/VAN_SPEED[regionId][2.78];addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_GRADE',evidenceState:isKnot(VH_GRADE[regionId],gd)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION',gradeDeg:gd,jointWithSpeed:true});}
        else {q*=f;trace.interactionState='INTERACTION_UNRESOLVED';addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_GRADE',evidenceState:'PROVISIONAL_SEPARABLE_COMPOSITION',gradeDeg:gd,transferDimension:'speed_or_other_axis'});}
      }else{
        q*=f;addComponent(trace,{axis:'GRADE',sourceFamily:'VAN_HOOREN_2024_R05_GRADE_SHAPE',evidenceState:near(v,2.78,1e-6)&&activeAxes.length===0?'BOUNDED_TRANSFER':'PROVISIONAL_SEPARABLE_COMPOSITION',gradeDeg:gd,transferDimension:'source_family_reference_alignment'});if(!near(v,2.78,1e-6)||activeAxes.length>0)trace.interactionState='INTERACTION_UNRESOLVED';
      }
      activeAxes.push('GRADE');gradeHandled=true;
    }
    if(!gradeHandled&&regionId==='R10'&&gp>=0&&gp<=15+1e-12){
      const raw=interp(HO_HEEL_GRADE,gp);
      if(raw!=null&&near(v,2.0,1e-6)){q=raw/HO.He[2.5];addComponent(trace,{axis:'GRADE',sourceFamily:'HO_2010_R10_UPHILL',evidenceState:isKnot(HO_HEEL_GRADE,gp)?'DIRECT_KNOT':'SOURCE_BOUNDED_INTERPOLATION',gradePercent:gp,jointWithSpeed:true});activeAxes.push('GRADE');gradeHandled=true;}
      else if(raw!=null&&v>=1.5-1e-12&&v<=2.5+1e-12){q*=raw/HO_HEEL_GRADE['0'];trace.interactionState='INTERACTION_UNRESOLVED';addComponent(trace,{axis:'GRADE',sourceFamily:'HO_2010_R10_UPHILL',evidenceState:'PROVISIONAL_SEPARABLE_COMPOSITION',gradePercent:gp,transferDimension:'speed'});activeAxes.push('GRADE');gradeHandled=true;}
    }
    if(!gradeHandled){
      if((regionId==='R10'||regionId==='R12')&&strike&&!strike.verified)trace.unquantified.push({axis:'FOOT_STRIKE',state:'INPUT_PROTOCOL_MISMATCH',reason:'SELF_REPORT_OR_UNVERIFIED_CANNOT_TRIGGER_HORIGUCHI'});
      trace.unquantified.push({axis:'GRADE',state:'EVIDENCE_INSUFFICIENT',reason:'OUTSIDE_AUTHORIZED_REGION_SOURCE_GEOMETRY'});
    }
  }

  // Narrow natural-grass route. Other surface shares remain explicitly unquantified.
  const gs=grassShare(surfaceComponents);
  if(gs>0){
    if(regionId==='R10'&&isOverground(runSetting)&&v>=11.4/3.6-1e-12&&v<=12.6/3.6+1e-12){
      q*=1+gs*(GRASS_R10-1); if(activeAxes.length>0)trace.interactionState='INTERACTION_UNRESOLVED'; addComponent(trace,{axis:'SURFACE',sourceFamily:'TESSUTTI_2012_NATURAL_GRASS',evidenceState:activeAxes.length>0?'PROVISIONAL_SEPARABLE_COMPOSITION':'BOUNDED_TRANSFER',grassShare:gs,regionMaskTransfer:true}); activeAxes.push('SURFACE');
    } else if(regionId==='R12'&&allowR12GrassEnvelope&&isOverground(runSetting)&&v>=11.4/3.6-1e-12&&v<=12.6/3.6+1e-12){
      envelope=[q*(1+gs*(R12_GRASS_ENVELOPE[0]-1)),q*(1+gs*(R12_GRASS_ENVELOPE[1]-1))]; addComponent(trace,{axis:'SURFACE',sourceFamily:'TESSUTTI_2012_NATURAL_GRASS',evidenceState:'PROVISIONAL_COMPONENT_ENVELOPE',grassShare:gs,assumption:'CENTRAL_FOREFOOT_BOUNDED_BY_OBSERVED_ADJACENT_COMPONENTS'}); activeAxes.push('SURFACE');
    } else trace.unquantified.push({axis:'SURFACE_NATURAL_GRASS',state:'EVIDENCE_INSUFFICIENT',reason:'REGION_OR_SPEED_OR_SETTING_NOT_SOURCE_COMPATIBLE'});
  }
  if(Array.isArray(surfaceComponents)){
    const unsupported=surfaceComponents.filter(x=>!String(x.category||x.userCategory||'').toUpperCase().includes('NATURAL_GRASS')).map(x=>String(x.category||x.userCategory||'UNKNOWN'));
    if(unsupported.length)trace.unquantified.push({axis:'SURFACE_OTHER',state:'EVIDENCE_INSUFFICIENT',categories:unsupported});
  }

  const finalState=weakest(trace.states.concat(trace.components.map(c=>c.evidenceState).filter(Boolean)));
  const value=100*d*q; const valueEnvelope=envelope?envelope.map(x=>100*d*x):null;
  return {regionId,state:'OK',distanceKm:d,speedMps:v,ratio:q,value,valueEnvelope,evidenceState:finalState,trace};
}

function wholeRunSpeed(distanceKm,durationMinutes){const d=Number(distanceKm),t=Number(durationMinutes);return d>0&&t>0?d*1000/(t*60):null}
function deriveRunningExposure(record){
  const fmt=String(record.runningFormat||'RUN').toUpperCase();
  if(fmt==='RUN_WALK'){
    const d=Number(record.runningDistanceKm),t=Number(record.runningDurationMinutes); if(!(d>0&&t>0))return {state:'RUNNING_PHASE_EXPOSURE_REQUIRED'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
  }
  const d=Number(record.distanceKm),t=Number(record.durationMinutes);if(!(d>0&&t>0))return {state:'INVALID_REQUIRED_RUNNING_FACT'};return {state:'OK',distanceKm:d,durationMinutes:t,speedMps:wholeRunSpeed(d,t),format:fmt};
}
function resolveSegments(record,exposure){
  const segs=Array.isArray(record.segments)?record.segments:[]; if(!segs.length)return {state:'NONE',segments:[]};
  const out=[];let total=0;
  for(const [i,s] of segs.entries()){
    let d=Number(s.distanceKm);if(!(d>=0)&&s.sharePercent!=null)d=exposure.distanceKm*Number(s.sharePercent)/100;
    if(!(d>=0))return {state:'INVALID_SEGMENT_DISTANCE',index:i}; total+=d;
    let speed=Number(s.speedMps);let speedProv='OBSERVED_OR_SEGMENT_DERIVED';
    if(!(speed>0)&&Number(s.durationMinutes)>0&&d>0)speed=d*1000/(Number(s.durationMinutes)*60);
    if(!(speed>0)){speed=exposure.speedMps;speedProv='MODEL_DERIVED_SEGMENT_SPEED_FALLBACK';}
    out.push({...s,distanceKm:d,speedMps:speed,speedProvenance:speedProv});
  }
  if(total>exposure.distanceKm+1e-8)return {state:'SEGMENT_EXPOSURE_EXCEEDS_RUNNING_DISTANCE',segmentDistanceKm:total,runningDistanceKm:exposure.distanceKm};
  if(total<exposure.distanceKm-1e-8)out.push({distanceKm:exposure.distanceKm-total,speedMps:exposure.speedMps,speedProvenance:'MODEL_DERIVED_SEGMENT_SPEED_FALLBACK',remainderState:'UNKNOWN_REMAINDER'});
  return {state:'OK',segments:out,segmentDistanceKm:total,remainderDistanceKm:Math.max(0,exposure.distanceKm-total)};
}
function summarizeRegions(segResults){
  const out={};
  for(const r of REGION_DEFS){
    const rs=segResults.map(x=>x.regionResults[r.id]); const known=rs.filter(x=>x?.value!=null); const unknown=rs.filter(x=>!x||x.value==null).reduce((s,x)=>s+(x?.distanceKm||0),0);
    const value=known.reduce((s,x)=>s+x.value,0); let env=null; const withEnv=known.filter(x=>x.valueEnvelope);
    if(withEnv.length){let lo=0,hi=0;for(const x of known){if(x.valueEnvelope){lo+=x.valueEnvelope[0];hi+=x.valueEnvelope[1]}else{lo+=x.value;hi+=x.value}}env=[lo,hi];}
    out[r.id]={value:unknown>0?null:value,knownValue:value,valueEnvelope:env,unsupportedDistanceKm:unknown,state:unknown>0?'PARTIAL_EVIDENCE':'OK',segmentEvidence:rs.map(x=>x?.evidenceState||'EVIDENCE_INSUFFICIENT')};
  }return out;
}

function gradeAxisSegments(record,exposure){
  const u=Number(record.uphillSharePercent??0),d=Number(record.downhillSharePercent??0),f=Math.max(0,100-u-d),gu=Number(record.uphillGradePercent??0),gd=Number(record.downhillGradePercent??0);
  if(u<0||d<0||u+d>100+1e-8||gu<0||gd<0)return null;
  const a=[];if(u>0)a.push({distanceKm:exposure.distanceKm*u/100,speedMps:exposure.speedMps,gradePercent:gu,axis:'GRADE_UP'});if(d>0)a.push({distanceKm:exposure.distanceKm*d/100,speedMps:exposure.speedMps,gradePercent:-gd,axis:'GRADE_DOWN'});if(f>0)a.push({distanceKm:exposure.distanceKm*f/100,speedMps:exposure.speedMps,gradePercent:0,axis:'GRADE_FLAT'});return a;
}
function surfaceAxisSegments(record,exposure){
  if(!Array.isArray(record.surfaceComponents)||!record.surfaceComponents.length)return null;let total=0;const a=[];for(const x of record.surfaceComponents){const sh=Number(x.sharePercent??x.share_percent??0);if(sh<0)return null;total+=sh;if(sh>0)a.push({distanceKm:exposure.distanceKm*sh/100,speedMps:exposure.speedMps,surfaceComponents:[{category:x.category||x.userCategory,sharePercent:100}],runSetting:record.runSetting,axis:'SURFACE'});}if(total>100+1e-8)return null;if(total<100-1e-8)a.push({distanceKm:exposure.distanceKm*(100-total)/100,speedMps:exposure.speedMps,axis:'SURFACE_UNKNOWN_REMAINDER'});return a;
}
function evalSegments(segments,record,{useWholeCadence=false}={}){return segments.map((s,i)=>({index:i,remainderState:s.remainderState||null,speedProvenance:s.speedProvenance||null,regionResults:Object.fromEntries(REGION_DEFS.map(r=>[r.id,evaluateRegionSegment(r.id,{...s,cadenceSpm:s.cadenceSpm??(useWholeCadence?record.averageCadenceSpm:null),personalHabitualCadenceSpm:s.personalHabitualCadenceSpm??(useWholeCadence?record.personalHabitualCadenceSpm:null),runSetting:s.runSetting??record.runSetting,footStrikeObservation:s.footStrikeObservation??record.footStrikeObservation,allowR12GrassEnvelope:record.allowR12GrassEnvelope===true})]))}))}

export function calculateRun(record={}){
  const exposure=deriveRunningExposure(record);if(exposure.state!=='OK')return {state:exposure.state,modelVersion:MODEL_VERSION};
  const seg=resolveSegments(record,exposure);
  if(seg.state==='OK'){
    const evaluated=evalSegments(seg.segments,record,{useWholeCadence:false});return {state:'OK',courseState:seg.remainderDistanceKm>0?'HYBRID_PARTIAL_SEGMENTED':'SEGMENTED_COLOCATED',exposure,segments:evaluated,regions:summarizeRegions(evaluated),modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  }
  if(seg.state!=='NONE')return {state:seg.state,...seg,modelVersion:MODEL_VERSION};

  // Whole-run baseline/cadence path. Marginal grade and surface axes are evaluated separately if both exist.
  const baseSeg=[{distanceKm:exposure.distanceKm,speedMps:exposure.speedMps,runSetting:record.runSetting}];
  const noCadenceEval=evalSegments(baseSeg,record,{useWholeCadence:false});const noCadenceRegions=summarizeRegions(noCadenceEval);
  const cadenceEval=evalSegments(baseSeg,record,{useWholeCadence:true});const cadenceRegions=summarizeRegions(cadenceEval);
  const gsegs=gradeAxisSegments(record,exposure), ssegs=surfaceAxisSegments(record,exposure);
  const hasGrade=!!gsegs&&(Number(record.uphillSharePercent??0)>0||Number(record.downhillSharePercent??0)>0);
  const hasSurface=!!ssegs;
  const hasCadence=record.averageCadenceSpm!=null;
  let gradeAxis=null,surfaceAxis=null;
  if(hasGrade)gradeAxis=summarizeRegions(evalSegments(gsegs,record,{useWholeCadence:false}));
  if(hasSurface)surfaceAxis=summarizeRegions(evalSegments(ssegs,record,{useWholeCadence:false}));
  const axisCount=(hasGrade?1:0)+(hasSurface?1:0)+(hasCadence?1:0);
  if(axisCount>1){
    const axes={}; if(hasCadence)axes.cadence=cadenceRegions;if(hasGrade)axes.grade=gradeAxis;if(hasSurface)axes.surface=surfaceAxis;
    return {state:'OK',courseState:'AXIS_MARGINAL_ONLY',combinedConditionState:'AXES_PRESERVED_NOT_COMBINED',exposure,regions:noCadenceRegions,axisEstimates:axes,modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
  }
  return {state:'OK',courseState:'WHOLE_RUN_ONLY',exposure,regions:hasGrade?gradeAxis:hasSurface?surfaceAxis:hasCadence?cadenceRegions:noCadenceRegions,axisEstimates:hasGrade?{grade:gradeAxis}:hasSurface?{surface:surfaceAxis}:hasCadence?{cadence:cadenceRegions}:{},modelVersion:MODEL_VERSION,outputSemanticVersion:OUTPUT_SEMANTIC_VERSION};
}

export function regionDefinition(id){return DEF.get(id)||null}
