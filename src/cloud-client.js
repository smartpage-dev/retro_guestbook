/* Real cloud adapter. Tokens stay in local private storage, never in logs or diagnostics. */
(function(root){
 'use strict';
 class CloudRequestError extends Error {constructor(message,status=0){super(message);this.status=status;}}
 function config(raw){
  if(!raw||raw.enabled===false)return null;
  const u=new URL(raw.serverOrigin),loop=['127.0.0.1','localhost'].includes(u.hostname);
  if((u.protocol!=='https:'&&!(loop&&u.protocol==='http:'))||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw new Error('Use a root HTTPS server origin, not a path.');
  if(!/^[a-f0-9]{32}$/.test(raw.eventId||'')||!/^[a-f0-9]{32}$/.test(raw.deviceId||'')||!new RegExp('^'+raw.deviceId+'\\.[A-Za-z0-9_-]{32}$').test(raw.deviceToken||''))throw new Error('Invalid device setup bundle.');
  return {enabled:true,serverOrigin:u.origin,eventId:raw.eventId,deviceId:raw.deviceId,deviceToken:raw.deviceToken,expiresAt:Number(raw.expiresAt)||0};
 }
 const binding=c=>c?c.serverOrigin+'|'+c.eventId+'|'+c.deviceId:'';
 const tokenOK=s=>/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(s||'');
 function guestURL(slot,viewOnly=false){
  const cfg=config(slot.transport);const token=viewOnly?slot.viewToken:slot.ownerToken;
  if(!tokenOK(token)||token.split('.')[0]!==slot.id||slot.eventId!==cfg.eventId)throw new Error('Invalid frozen guest identity.');
  return cfg.serverOrigin+'/guest/#'+token;
 }
 async function request(cfg,path,{method='GET',body,bytes,chunkHash,token,fetcher=globalThis.fetch}={}){
  const headers={'Authorization':'Bearer '+(token||cfg.deviceToken)};let data;
  if(bytes!==undefined){headers['Content-Type']='application/octet-stream';headers['X-Chunk-SHA256']=chunkHash;data=bytes;}
  else if(method!=='GET'){headers['Content-Type']='application/json';data=JSON.stringify(body||{});}
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),25000);
  try{
   const r=await fetcher(cfg.serverOrigin+path,{method,headers,body:data,signal:ctrl.signal,credentials:'omit',cache:'no-store',redirect:'error'});
   let answer;try{answer=await r.json();}catch{throw new CloudRequestError('Invalid cloud response.',r.status);}
   if(!r.ok)throw new CloudRequestError(String(answer.error||'cloud_request_failed').slice(0,100),r.status);
   return answer;
  }finally{clearTimeout(timer);}
 }
 async function sha(blob){const b=await blob.arrayBuffer(),d=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');}
 class Client {
  constructor({store,list,change,purge,canRun,onStatus=()=>{},fetcher=globalThis.fetch}){Object.assign(this,{store,list,change,purge,canRun,onStatus,fetcher});this.connection=null;this.busy=false;this.refilling=false;this.lastSync=0;this.lastRefill=0;this.error='';this.poolCount=0;}
  async init(){const raw=await this.store.getAux('cloud-connection');this.connection=raw?.enabled?config(raw):null;await this.poolStatus();}
  async call(c,path,opts={}){return request(c,path,{...opts,fetcher:this.fetcher});}
  async connect(raw){
   const c=config(raw);if(!c)throw new Error('Paste a valid setup bundle.');
   const proof=await this.call(c,'/api/device/verify');
   if(proof.deviceId!==c.deviceId||proof.event.id!==c.eventId||proof.publicOrigin!==c.serverOrigin)throw new Error('Server identity does not match this setup bundle.');
   c.expiresAt=proof.event.expiresAt;
   const old=this.connection;await this.store.setAux('cloud-connection',c);this.connection=c;
   if(binding(old)!==binding(c))await this.store.setAux('cloud-pool',{binding:binding(c),slots:[]});
   this.error='';await this.refill();return proof;
  }
  async verifyEvent(){
   if(!this.connection)return null;
   const proof=await this.call(this.connection,'/api/device/verify');
   if(proof.deviceId!==this.connection.deviceId||proof.event?.id!==this.connection.eventId||proof.publicOrigin!==this.connection.serverOrigin)throw new Error('Event identity changed on cloud.');
   return proof.event;
  }
  async disable(){await this.store.setAux('cloud-connection',{enabled:false});this.connection=null;this.onStatus();}
  async poolStatus(){const pool=await this.store.getAux('cloud-pool');this.poolCount=pool?.binding===binding(this.connection)?pool.slots.filter(s=>s.expiresAt*1000>Date.now()).length:0;this.onStatus();return this.poolCount;}
  async refill(){
   if(!this.connection||this.refilling)return;this.refilling=true;this.lastRefill=Date.now();
   try{
    const c=this.connection,pool=await this.store.getAux('cloud-pool');
    const slots=pool?.binding===binding(c)?pool.slots.filter(s=>s.expiresAt*1000>Date.now()):[];
    if(slots.length>=12)return;
    const answer=await this.call(c,'/api/device/reserve',{method:'POST',body:{count:12-slots.length}});
    if(!Array.isArray(answer.slots)||!answer.slots.length||answer.slots.length>12)throw new Error('Invalid reservation response.');
    const seen=new Set(slots.map(x=>x.id));for(const slot of answer.slots){guestURL({...slot,transport:c});if(seen.has(slot.id)||slot.expiresAt*1000<=Date.now())throw new Error('Duplicate or expired reservation rejected.');seen.add(slot.id);}
    if(binding(c)!==binding(this.connection))throw new Error('Connection changed during reservation.');
    await this.store.appendCloudSlots(binding(c),answer.slots);this.error='';
   }catch(e){this.error=e.message;throw e;}finally{this.refilling=false;await this.poolStatus();}
  }
  async claim(localId){
   if(!this.connection)return null;
   if(this.connection.expiresAt*1000<=Date.now())throw new Error('Cloud event expired. Configure another event or explicitly use local-only mode.');
   const slot=await this.store.takeCloudSlot(binding(this.connection),localId);
   if(!slot)throw new Error('No reserved QR links remain. Reconnect and refill in Admin, or explicitly select local-only mode.');
   const frozen={...slot,transport:{...this.connection},status:'waiting',attempts:0,retryAt:0,lastCheck:0};guestURL(frozen);await this.poolStatus();return frozen;
  }
  async patch(id,values){return this.change(id,c=>({...c,cloud:{...c.cloud,...values}}));}
  async upload(clip){
   const cc=clip.cloud,cfg=config(cc.transport),base='/api/device/clip/'+cc.id;
   if(!clip.blob||clip.kind!=='real'||clip.interrupted||clip.validation?.status!=='metadata_readable')return;
   if(!this.canRun())return;
   const init=await this.call(cfg,base+'/init',{method:'POST',body:{size:clip.blob.size,sha256:clip.sha256,mime:clip.mime.split(';')[0],sourceId:clip.id,seq:clip.seq}});
   const received=new Set(init.received||[]);
   if(init.status!=='ready'){
    await this.patch(clip.id,{status:'uploading'});
    for(let i=0;i<Math.ceil(clip.blob.size/524288);i++){
     if(!this.canRun())return;
     if(received.has(i))continue;
     const chunk=clip.blob.slice(i*524288,(i+1)*524288);const hash=await sha(chunk);
     if(!this.canRun())return;
     await this.call(cfg,base+'/chunk/'+i,{method:'PUT',bytes:chunk,chunkHash:hash});
    }
   }
   if(!this.canRun())return;
   const result=await this.call(cfg,base+'/complete',{method:'POST'});
   if(!result.ready||result.sha256!==clip.sha256||result.size!==clip.blob.size)throw new Error('Cloud verification did not match the local file.');
   await this.patch(clip.id,{status:'ready',attempts:0,retryAt:0,lastError:'',verifiedAt:Date.now()});
  }
  async thumbnail(clip){
   const cc=clip.cloud;
   if(!cc||cc.status!=='ready'||cc.thumbnailUploaded||!this.canRun())return;
   const still=clip.ticketSnapshot||clip.rawSnapshot;
   if(typeof still!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(still)||still.length>350000)return;
   const decoded=atob(still.split(',')[1]);const bytes=new Uint8Array(decoded.length);
   for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
   if(bytes.length<64||bytes.length>262144)return;
   const blob=new Blob([bytes],{type:'application/octet-stream'});
   const result=await this.call(config(cc.transport),'/api/device/clip/'+cc.id+'/thumbnail',{method:'PUT',bytes:blob,chunkHash:await sha(blob)});
   if(result.thumbnailReady!==true)throw new Error('Cloud did not acknowledge thumbnail.');
   await this.patch(clip.id,{thumbnailUploaded:true,thumbnailError:'',thumbnailRetryAt:0});
  }
  async sync(clip){
   const cc=clip.cloud;if(!cc)return;
   const result=await this.call(config(cc.transport),'/api/device/clip/'+cc.id+'/status');
   if(result.id!==cc.id)throw new Error('Cloud clip identity mismatch.');
   if(result.status==='deleted'){
    await this.purge(clip); // Must commit local tombstone before acknowledging.
    await this.call(cc.transport,'/api/device/clip/'+cc.id+'/ack-delete',{method:'POST'});
    return;
   }
   await this.change(clip.id,c=>({...c,guestPermission:result.permission,moderation:result.moderation,cloud:{...c.cloud,lastCheck:Date.now(),serverRevision:result.revision}}));
  }
  async tick(){
   if(this.busy||!this.canRun())return;this.busy=true;
   try{
    const rows=await this.list();
    for(const clip of rows){
     if(!this.canRun())return;
     if(!clip.cloud)continue;
     if(clip.lifecycle==='deleted'){
      if(clip.cloud.ackPending){try{await this.call(clip.cloud.transport,'/api/device/clip/'+clip.cloud.id+'/ack-delete',{method:'POST'});await this.store.ackCloudDeletion(clip.id);}catch(e){this.error=e.message;}}
      continue;
     }
     if((clip.cloud.retryAt||0)>Date.now())continue;
     try{
      if(Date.now()-(clip.cloud.lastCheck||0)>15000)await this.sync(clip);
      const latest=(await this.list()).find(x=>x.id===clip.id);
      if(!latest||latest.lifecycle==='deleted')continue;
      if(latest.cloud.status!=='ready')await this.upload(latest);
      const forThumbnail=(await this.list()).find(x=>x.id===clip.id);
      if(forThumbnail?.cloud?.status==='ready' && (forThumbnail.cloud.thumbnailRetryAt||0)<=Date.now()){
       try{await this.thumbnail(forThumbnail);}catch(e){
        await this.patch(clip.id,{thumbnailRetryAt:Date.now()+60000,thumbnailError:e.message});
       }
      }
      this.error='';
     }catch(e){
      this.error=e.message;const n=(clip.cloud.attempts||0)+1,delay=[5000,15000,60000,300000][Math.min(n-1,3)];
      if(e.status===410){await this.purge(clip);}else await this.patch(clip.id,{status:'waiting',attempts:n,retryAt:Date.now()+delay,lastError:e.message});
     }
    }
    if(this.connection&&this.poolCount<6&&Date.now()-this.lastRefill>30000&&this.canRun()){try{await this.refill();}catch{}}
   }finally{this.busy=false;this.onStatus();}
  }
  async remove(clip){await this.call(clip.cloud.transport,'/api/device/clip/'+clip.cloud.id+'/delete',{method:'POST',body:{confirm:'DELETE'}});}
  async permission(clip,value){await this.call(clip.cloud.transport,'/api/guest/permission',{method:'POST',token:clip.cloud.ownerToken,body:{permission:value}});}
 }
 const api={config,binding,guestURL,request,Client,sha};root.RetroCloud=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
