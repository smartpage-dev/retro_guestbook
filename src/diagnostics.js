/* Privacy-minimized diagnostic events. No media, credentials, QR links or device identifiers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RetroDiagnostics=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const secretKey=/(token|secret|pass|credential|authorization|cookie|bearer|apikey|api_key|deviceid|groupid|serial|mac|address|url|uri|origin|hash|blob|snapshot|thumbnail|mediaData|mediaBytes|base64|key$|label$|^id$)/i;
function safe(value,depth=0){
 if(value==null||typeof value==='boolean'||typeof value==='number')return Number.isFinite(value)||typeof value!=='number'?value:null;
 if(typeof value==='string')return value.replace(/https?:\/\/[^\s"'<>]+/gi,'[URL REDACTED]').replace(/(?:bearer\s+)[\w.\-]+/gi,'[AUTH REDACTED]').replace(/(?:\/home\/|\/Users\/|[A-Z]:\\\\)[^\s"'<>]+/g,'[PATH REDACTED]').slice(0,240);
 if(depth>=4)return '[DEPTH LIMIT]';
 if(Array.isArray(value))return value.slice(0,25).map(x=>safe(x,depth+1));
 if(typeof value==='object'){
  const result={};for(const [k,v] of Object.entries(value).slice(0,35))result[k.slice(0,64)]=secretKey.test(k)?'[REDACTED]':safe(v,depth+1);return result;
 }
 return '[UNSUPPORTED]';
}
class Ring{
 constructor(limit=500){this.limit=Math.min(1000,Math.max(10,limit));this.events=[];}
 add(name,detail={}){const entry={at:new Date().toISOString(),name:String(name).slice(0,70),detail:safe(detail)};this.events.push(entry);if(this.events.length>this.limit)this.events.shift();return entry;}
 snapshot(){return this.events.map(e=>({...e,detail:safe(e.detail)}));}
 clear(){this.events.length=0;}
}
return {Ring,safe};
});
