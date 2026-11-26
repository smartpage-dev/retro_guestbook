/* Independent Android secure-SPP client. Browser builds never pretend to have this transport. */
(function(root){
 'use strict';
 const PROFILE='native-qr-model2-m-size4-v1';
 function guestTicket(clip,parent=''){
  if(!clip||clip.kind!=='real'||clip.lifecycle==='deleted'||clip.interrupted||clip.validation?.status!=='metadata_readable'||!clip.cloud||clip.settings?.receipt==='photo')throw new Error('Select a saved, non-deleted cloud recording with a QR receipt.');
  const payload=root.RetroCloud.guestURL(clip.cloud),snapshot=clip.deliverySnapshot;
  if(!snapshot?.online||!snapshot.containsQR||snapshot.clipId!==clip.id||snapshot.payload!==payload||!/^[a-f0-9]{32}$/.test(clip.id))throw new Error('The frozen QR does not match this saved recording.');
  const u=new URL(payload);
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.search||u.pathname!=='/guest/'||!/^#[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(u.hash)||!/^[\x21-\x7e]{1,256}$/.test(payload))throw new Error('Native QR pilot requires an approved HTTPS guest link of at most 256 ASCII bytes.');
  if(!Number.isSafeInteger(clip.seq)||clip.seq<1||clip.seq>9999999)throw new Error('Invalid message number.');
  if(parent&&parent!==clip.id)throw new Error('Explicit reprints must reference this recording original ticket.');
  return {jobId:parent?root.RetroCore.randomId():clip.id,clipId:clip.id,payload,label:String(clip.seq),parent};
 }
 async function hash(text){if(!root.crypto?.subtle)throw new Error('Secure hashing is required for the printer bridge.');const b=new TextEncoder().encode(text),d=await root.crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');}
 class Client{
  constructor(bridge=root.RetroPrinterNative){this.bridge=bridge;this.pending=new Map();this.available=!!bridge?.postMessage;this.status={available:this.available,connected:false,automaticEnabled:false,fastReturnArmed:false,paperStatus:'unavailable'};if(this.available)bridge.onmessage=e=>{try{const m=JSON.parse(e.data),p=this.pending.get(m.id);if(!p||m.version!==1)return;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(m.error)):p.resolve(m.data);}catch{}};}
  call(op,values={},timeout=20000){if(!this.available)return Promise.reject(new Error('Bluetooth QR printing requires the v0.9 Android APK, not Chrome or the Hostinger web page.'));
   const id=root.RetroCore.randomId();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);if(op==='print'||op==='test')try{this.bridge.postMessage(JSON.stringify({id:root.RetroCore.randomId(),op:'cancel',requestId:id}));}catch{}reject(new Error('Native request timed out. Outcome may be unknown; do not automatically reprint.'));},timeout);this.pending.set(id,{resolve,reject,timer});try{this.bridge.postMessage(JSON.stringify({id,op,...values}));}catch{clearTimeout(timer);this.pending.delete(id);reject(new Error('Native printer channel unavailable.'));}});
  }
  pause(){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Native app paused; print outcome may be unknown.'));}this.pending.clear();this.status.connected=false;this.status.automaticEnabled=false;this.status.fastReturnArmed=false;}
  async refresh(){if(!this.available)return this.status;this.status=await this.call('status');return this.status;}
  async send(clip,{automatic=false,reprint=false,waitMs=12000,deadlineEpochMs=0,isCurrent=()=>true}={}){
   const t=guestTicket(clip,reprint?clip.id:'');const expected=await hash(t.payload);
   const end=automatic?(deadlineEpochMs||Date.now()+waitMs):0;
   if(!isCurrent()||(automatic&&Date.now()>=end))throw new Error('Print hand-off expired before submission.');
   const photo=await root.RetroTicketPhoto.fromClip(clip);
   if(!isCurrent()||(automatic&&Date.now()>=end))throw new Error('Photo preparation took too long; no ticket sent.');
   const r=await this.call('print',{...t,...photo,automatic,deadlineEpochMs:end,waitMs:Math.max(1000,Math.min(15000,waitMs))},automatic?Math.max(1,end-Date.now()):90000);
   if((r?.photoIncluded===true)!==Boolean(photo.photoBase64))throw new Error('Native printer photo acknowledgement mismatch. Inspect paper; do NOT automatically retry.');
   if(r?.jobId!==t.jobId||r.clipId!==t.clipId||r.urlHash!==expected||r.transport!=='android_secure_spp'||r.simulated!==false||r.paperConfirmed!==false||!['sent_unconfirmed','failed_before_send','outcome_unknown'].includes(r.state))throw new Error('Mismatched native result. Keep the screen QR; inspect paper and journal before reprinting.');
   if(r.status)this.status=r.status;
   return {...clip.deliverySnapshot,...r,payload:t.payload,nativeValidated:true,fastReturnEligible:r.fastReturnEligible===true&&!r.duplicate};
  }
 }
 root.RetroPrinter={PROFILE,guestTicket,hash,Client};if(typeof module!=='undefined'&&module.exports)module.exports=root.RetroPrinter;
})(typeof window==='undefined'?globalThis:window);
