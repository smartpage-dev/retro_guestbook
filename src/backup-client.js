/* Optional Android Storage Access Framework bridge. No filesystem paths and no write access
 * outside the user-selected tree. Independent copied videos cannot be revoked on guest deletion.
 */
(function(root){
 'use strict';
 function fileNameFor(clip){
  if(!clip||clip.kind!=='real'||!clip.blob||!/^[a-f0-9]{32}$/.test(clip.id))throw new Error('A saved real recording is required.');
  const date=new Date(clip.createdAt);if(Number.isNaN(date.getTime()))throw new Error('Invalid original recording time.');
  const stamp=date.toISOString().slice(0,19).replace(/[-:T]/g,'');
  const number=String(clip.seq).padStart(5,'0');
  const type=String(clip.mime||clip.blob.type||'').split(';',1)[0].toLowerCase();
  if(!['video/webm','video/mp4'].includes(type))throw new Error('Only original WebM/MP4 recordings can be copied to USB.');
  return 'RetroBooth_'+stamp+'_'+number+'_'+clip.id.slice(0,16)+(type==='video/mp4'?'.mp4':'.webm');
 }
 function isSaved(clip){return !!(clip&&clip.kind==='real'&&clip.lifecycle!=='deleted'&&clip.blob instanceof Blob&&clip.blob.size>0);}
 function key(folder,clip){return folder+':'+clip.id;}
 class RetroBackupClient {
  constructor(native){
   if(!native?.postMessage)throw new Error('Android native USB backup bridge is missing.');
   this.native=native;this.pending=new Map();this.copying=false;
   const original=native.onmessage;
   native.onmessage=e=>{
    try{const msg=JSON.parse(e.data);const handler=this.pending.get(msg.id);
     if(handler){this.pending.delete(msg.id);clearTimeout(handler.timer);if(msg.error)handler.reject(new Error(msg.error));else handler.resolve(msg);return;}}
    catch(e){}if(typeof original==='function')original(e);
   };
  }
  async command(op,data={},id=null,timeout=30000){
   id=id||this.newId();if(this.pending.has(id))throw new Error('Duplicate native backup command.');
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Android USB backup operation timed out ('+op+').'));},timeout);
    this.pending.set(id,{resolve,reject,timer});
    try{this.native.postMessage(JSON.stringify({id,op,...data}));}
    catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}
   });
  }
  newId(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
  status(){return this.command('status');}
  select(){return this.command('select',{},null,600000);}
  enable(){return this.command('enable');}
  pause(){return this.command('pause');}
  forget(){return this.command('forget');}
  metadata(clip){
   const sha=clip.sha256;if(!/^[a-f0-9]{64}$/.test(sha||''))throw new Error('This video has no SHA-256. Keep it locally and export manually.');
   const name=fileNameFor(clip),type=name.endsWith('.mp4')?'video/mp4':'video/webm';
   if(clip.blob.size>268435456)throw new Error('USB transfer limit is 256 MiB per recording. Export this one manually.');
   return {name,mime:type,size:clip.blob.size,sha256:sha};
  }
  async copy(clip,onProgress=()=>{},canContinue=()=>true){
   if(this.copying)throw new Error('Another USB copy is in progress.');
   this.copying=true;const id=this.newId();let began=false;
   try{
    const meta=this.metadata(clip);
    if(!canContinue())throw new Error('USB copy postponed until booth is idle.');
    // A timed-out/lost begin acknowledgement may still leave a native temp open.
    // Always attempt abort with the same ID, even when begin itself fails.
    began=true;const first=await this.command('begin',meta,id,60000);
    if(first.alreadyVerified)return {bytes:meta.size,verified:true,alreadyVerified:true,name:meta.name};
    for(let index=0,offset=0;offset<meta.size;index++,offset+=32768){
     if(!canContinue())throw new Error('USB copy postponed until booth is idle.');
     const bytes=new Uint8Array(await clip.blob.slice(offset,Math.min(offset+32768,meta.size)).arrayBuffer());
     let chars='';for(const b of bytes)chars+=String.fromCharCode(b);
     const result=await this.command('chunk',{index,base64:btoa(chars)},id,60000);
     if(index%4===0||offset+bytes.length>=meta.size)onProgress(result.bytes,meta.size);
    }
    const outcome=await this.command('finish',{},id,180000);
    if(!outcome.verified||outcome.bytes!==meta.size)throw new Error('Native USB copy was not independently verified.');
    return {bytes:outcome.bytes,verified:true,name:outcome.name};
   }catch(error){
    if(began){try{await this.command('abort',{},id,12000);}catch{}}
    throw error;
   }finally{this.copying=false;}
  }
  async verify(clip){
   const meta=this.metadata(clip);const result=await this.command('verify',meta,null,180000);
   if(!result.verified||result.bytes!==meta.size)throw new Error('USB copy could not be verified.');
   return result;
  }
 }
 const api={RetroBackupClient,fileNameFor,isSaved,key};
 root.RetroBackup=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
