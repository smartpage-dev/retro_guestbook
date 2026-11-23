/* Shared colour math for the GPU and Canvas2D paths. No AI or remote processing. */
(function(root){
 'use strict';
 const defaults=Object.freeze({
  film:Object.freeze({grain:.035,scan:.085,saturation:.78,warmth:.28,softness:.26}),
  heritage:Object.freeze({grain:.04,scan:.12,saturation:.045,warmth:.60,softness:.42}),
  bw:Object.freeze({grain:.035,scan:.10,saturation:0,warmth:0,softness:.34})
 });
 const names={film:'Colour Film CRT',heritage:'Heritage Soft Mono',bw:'Neutral Black & White'};
 function bounded(n,min,max,fallback){return typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 function safe(raw={}){
  if(!raw||typeof raw!=='object')raw={};
  const profiles={};
  for(const [key,d] of Object.entries(defaults)){
   const p=raw.lookProfiles?.[key]||{};
   profiles[key]={grain:bounded(p.grain,0,.12,d.grain),scan:bounded(p.scan,0,.30,d.scan),
    saturation:bounded(p.saturation,0,1.25,d.saturation),warmth:bounded(p.warmth,0,1,d.warmth),softness:bounded(p.softness,0,1,d.softness)};
  }
  return {lookMode:['follow','film','heritage','bw'].includes(raw.lookMode)?raw.lookMode:'follow',lookProfiles:profiles};
 }
 function resolve(settings){
  const safeValue=safe(settings);const key=safeValue.lookMode==='follow'?(settings?.screenStyle==='edge'?'film':'heritage'):safeValue.lookMode;
  const p={...safeValue.lookProfiles[key]};if(key==='bw'){p.saturation=0;p.warmth=0;}
  return {key,name:names[key],...p};
 }
 function grade(p){
  // Row-major 3x3 matrix: luminance-aware desaturation, restrained tint, lifted blacks.
  const s=p.key==='bw'?0:p.saturation,lum=[.299,.587,.114];
  const strength=p.key==='film'?.075:.16,warm=p.key==='bw'?0:p.warmth;
  const gains=[1+warm*.018,1,1-warm*strength];
  const contrast=p.key==='film'?.91:.94,lift=p.key==='film'?.042:.021;
  const matrix=[];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)matrix.push(((1-s)*lum[col]+(row===col?s:0))*contrast*gains[row]);
  return {matrix,offset:[lift+warm*.008,lift+warm*.006,lift],width:Math.round((800-p.softness*300)/2)*2};
 }
 function transform(r,g,b,p){const {matrix:m,offset:o}=grade(p);return [0,1,2].map(i=>Math.max(0,Math.min(255,(m[i*3]*r+m[i*3+1]*g+m[i*3+2]*b)+o[i]*255)));}
 const api={defaults,names,bounded,safe,resolve,grade,transform};root.RetroEffects=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
