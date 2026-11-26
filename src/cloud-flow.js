/* Controller integration: existing capture remains local-first; QR ownership is frozen per clip. */
let cloudClient=null,sessionCloud=null,cloudClaimBusy=false,cloudTimer=null;
async function authorizeNativeCloud(origin){
 if(window.RetroDesktop?.authorizeCloud){await window.RetroDesktop.authorizeCloud(origin);return;}
 if(!window.RetroCloudNative?.postMessage)return;
 const id=C.randomId();await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Native cloud approval timed out.')),60000);
  RetroCloudNative.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.id!==id)return;clearTimeout(timer);m.error?reject(new Error(m.error)):resolve();}catch{}};
  RetroCloudNative.postMessage(JSON.stringify({id,origin}));
 });
}
function renderCloud(){
 if(!cloudClient||!$('cloudStatus'))return;
 const c=cloudClient.connection,rows=clips.filter(x=>x.cloud);
 $('cloudStatus').textContent=(c?'CONNECTED / '+c.serverOrigin+' / '+cloudClient.poolCount+' reserved QR links':'LOCAL-ONLY for new recordings')+' / '+rows.filter(x=>x.cloud.status==='ready').length+' cloud verified / '+rows.filter(x=>x.cloud.status!=='ready').length+' waiting'+(cloudClient.error?' / '+cloudClient.error:'');
 $('cloudQueue').replaceChildren();
 for(const clip of rows.slice(-30).reverse()){
  const line=document.createElement('div');line.className='cloud-job';const text=document.createElement('span');text.textContent='Message '+clip.seq+' / '+clip.cloud.status+(clip.cloud.lastError?' / '+clip.cloud.lastError:'');line.append(text);
  for(const [label,readonly] of [['Private guest page',false],['View-only link',true]]){
   const a=document.createElement('a');a.className='btn secondary';a.textContent=label;a.href=RetroCloud.guestURL(clip.cloud,readonly);a.target='_blank';a.rel='noopener noreferrer';line.append(a);
  }$('cloudQueue').append(line);
 }
}
async function purgeCloudClip(clip){
 const tomb={id:clip.id,seq:clip.seq,createdAt:clip.createdAt,lifecycle:'deleted',deletedAt:new Date().toISOString(),guestPermission:'hidden',moderation:'pending',cloud:{id:clip.cloud.id,transport:clip.cloud.transport,ackPending:true}};
 await changeClip(clip.id,()=>tomb);
 if(lastReceipt?.clip.id===clip.id){lastReceipt=null;$('receiptDownload').disabled=true;const cv=$('receiptCanvas');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}
 if(selectedClip?.id===clip.id){selectedClip=null;if(playbackURL)URL.revokeObjectURL(playbackURL);playbackURL=null;$('playback').pause();$('playback').removeAttribute('src');$('playback').load();if($('clipDialog').open)$('clipDialog').close();}
 if(guestId===clip.id)renderGuest(tomb);
 if(sessionId===clip.id){snapshots=[];snapIndex=0;sessionCloud=null;}
 reconcileDelivery();reconcileShow();renderCloud();
}
async function setupCloud(){
 if(!store.getAux||!store.available){$('cloudStatus').textContent='Persistent storage unavailable. Cloud remains disabled; demo UI still works.';return;}
 cloudClient=new RetroCloud.Client({store,list:()=>store.list(),change:changeClip,purge:purgeCloudClip,canRun:()=>ready&&tabAllowed&&surfaceRole==='booth'&&state==='idle'&&!settingsSaving&&!cloudClaimBusy&&!document.hidden,onStatus:renderCloud});
 try{await cloudClient.init();}catch(e){cloudClient.error=e.message;renderCloud();}
 async function action(fn){if(state!=='idle'||settingsSaving||cloudClaimBusy){toast('Finish the current session first.');return;}const buttons=$('cloudCard').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);settingsSaving=true;renderState();try{await fn();}catch(e){cloudClient.error=e.message;toast(e.message);}finally{settingsSaving=false;buttons.forEach(b=>b.disabled=false);renderState();renderCloud();}}
 $('cloudConnect').onclick=()=>action(async()=>{const raw=JSON.parse($('cloudBundle').value);const cfg=RetroCloud.config(raw);await authorizeNativeCloud(cfg.serverOrigin);await cloudClient.connect(cfg);$('cloudBundle').value='';toast('Cloud verified. Reserved links are saved locally.');});
 $('cloudRefill').onclick=()=>action(()=>cloudClient.refill());
 $('cloudDisable').onclick=()=>action(()=>cloudClient.disable());
 $('cloudRetry').onclick=async()=>{if(state!=='idle'||settingsSaving)return;for(const clip of clips.filter(c=>c.cloud))await cloudClient.patch(clip.id,{retryAt:0,lastCheck:0});cloudClient.error='';await cloudClient.tick();};
 cloudTimer=setInterval(()=>cloudClient.tick().catch(e=>{cloudClient.error=e.message;renderCloud();}),2000);
 window.addEventListener('online',()=>{cloudClient.lastRefill=0;cloudClient.tick().catch(()=>{});});
}
