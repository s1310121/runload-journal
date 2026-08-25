const KNOWN=new Set(["PAVED","TRACK","SOIL","TRAIL","NATURAL_GRASS","ARTIFICIAL_TURF","SAND"]);
export const A9_FCR_COMPOSITION_VERSION="RunLoad-A9-FCR-secondary-composition-v1.0";
function fnv1a(text=""){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,"0");}
export function normalizedMixedSurfaceComponents(context={}){
 if(context?.gait!=="RUN"||context?.runSetting!=="OUTDOOR")return null;
 const comps=(Array.isArray(context.surfaceComponents)?context.surfaceComponents:[]).filter(c=>Number(c.sharePercent)>0).map(c=>({surface:String(c.userCategory??c.componentId??"").toUpperCase(),share:Number(c.sharePercent)}));
 if(comps.length<2||comps.some(c=>!KNOWN.has(c.surface)||!Number.isFinite(c.share)||c.share<=0))return null;
 const total=comps.reduce((s,c)=>s+c.share,0);if(Math.abs(total-100)>1e-6)return null;
 const merged=new Map();for(const c of comps)merged.set(c.surface,(merged.get(c.surface)||0)+c.share);
 const out=[...merged].map(([surface,share])=>({surface,share})).filter(c=>c.share>0).sort((a,b)=>a.surface.localeCompare(b.surface));
 return out.length>=2?out:null;
}
export function evaluateA9FcrMixedSurfaceComposite(regionId,context={},componentResults=[],options={}){
 if(options.includeProvisional===false)return null;
 const comps=normalizedMixedSurfaceComponents(context);if(!comps||componentResults.length!==comps.length)return null;
 const joined=comps.map((c,i)=>({c,r:componentResults[i]}));if(joined.some(x=>!x.r||!Number.isFinite(x.r.ratio)||x.r.ratio<=0||(x.r.routes?.length??0)===0))return null;
 const ratio=Math.exp(joined.reduce((s,x)=>s+(x.c.share/100)*Math.log(x.r.ratio),0));
 const componentSet=comps.map(c=>c.surface).join("+");
 const sigParts=joined.map(x=>`${x.c.surface}:${x.r.a9RouteSignature??x.r.routes.join('+')}`).sort();
 const sigHash=fnv1a(sigParts.join('|'));const setHash=fnv1a(componentSet);
 const constructId=`FCR_MIXED_SURFACE_DIMENSIONLESS_RESPONSE_COMPOSITE__${regionId}__${setHash}`;
 const refId=`A9-FCR-MIXSURF-RDEF-${regionId}-${setHash}`;const routeId=`A9-FCR-MIXSURF-${regionId}-${setHash}`;
 return {ratio,state:"PARTIAL",routes:[routeId],interactions:[],sources:[...new Set(joined.flatMap(x=>x.r.sources??[]))],parameters:[],
  trace:[{traceCode:"A9_FCR_P3_MIXED_SURFACE_COMPOSITION",message:"Combines already-authorized component-surface dimensionless regional response ratios using the recorded surface shares.",numericEffectApplied:true},{traceCode:"NO_RAW_CROSS_SURFACE_MAGNITUDE_BLEND",message:"Raw force/stress/EMG/pressure/work magnitudes from different source families are not combined.",numericEffectApplied:false},{traceCode:"NO_GENERIC_SURFACE_COEFFICIENT",message:"No new generic surface multiplier is introduced by mixed-surface composition.",numericEffectApplied:false}],
  componentCoverage:{state:"PARTIAL",observedComponentIds:[constructId],missingComponentIds:["FORMAL_MIXED_SURFACE_INTERACTION_NOT_CLAIMED"],normalizedWeights:{[constructId]:1}},
  evidenceRange:{axis:"surfaceComposition",geometry:"P3_SHARE_WEIGHTED_GEOMETRIC_DIMENSIONLESS_COMPOSITE",ruleId:"A9-FCR-MIXSURF-P3-V1",referenceDefinitionId:refId,evidenceClass:"PROJECT_DERIVED_P3_MIXED_SURFACE_COMPOSITE",supportTier:"PROVISIONAL_AUTHORIZED",componentSurfaces:comps,rawMagnitudeBlended:false,genericSurfaceCoefficientAdded:false},
  a9SemanticIdentity:{constructId,referenceDefinitionId:refId,evidenceClass:"PROJECT_DERIVED_P3_MIXED_SURFACE_COMPOSITE"},a9SupportTier:"PROVISIONAL_AUTHORIZED",a9RouteSignature:`${regionId}|FCR_MIXSURF_P3|SET_${setHash}|UNDER_${sigHash}|V1`,a9UncertaintyClass:"P3_VERY_HIGH_MIXED_SURFACE_COMPOSITE",a9SourceLayer:"A9_FCR_MIXED_SURFACE_P3",
  a9Composition:{type:"MIXED_SURFACE",components:joined.map(x=>({surface:x.c.surface,sharePercent:x.c.share,ratio:x.r.ratio,routeSignature:x.r.a9RouteSignature??null})),rawMagnitudeBlended:false,genericSurfaceCoefficientAdded:false}
 };
}
