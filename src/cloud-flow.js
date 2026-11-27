/* Controller integration: existing capture remains local-first; QR ownership is frozen per clip. */
let cloudClient=null,sessionCloud=null,cloudClaimBusy=false,cloudTimer=null,cloudEventPoll=null,cloudEventSyncBusy=false,cloudEventApplied="";
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
 $('cloudStatus').textContent=(c?'CONNECTED / '+c.serverOrigin+' / '+cloudClient.poolCount+' reserved QR links':'LOCAL-ONLY for new recordings')+' / '+rows.filter(x=>x.cloud.status==='ready').length+' cloud verified / '+rows.filter(x=>x.cloud.status!=='ready').length+' waiting'+(cloudEventApplied?' / CLOUD EVENT REV '+cloudEventApplied.split('|').at(-1):'')+(cloudClient.error?' / '+cloudClient.error:'');
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
// Cloud is the source of truth for event presentation and capture settings only.
// Never update a session in progress; each capture already freezes sessionSettings.
async function pullCloudEvent(force=false,knownEvent=null){
 if(!cloudClient?.connection||cloudEventSyncBusy||state!=='idle'||cameraBusy||cloudClaimBusy||printerActionBusy||document.hidden)return false;
 cloudEventSyncBusy=true;
 try{
  const c=cloudClient.connection,event=knownEvent||await cloudClient.verifyEvent();
  if(!c||event?.id!==c.eventId)throw new Error('Cloud event mismatch; settings were not applied.');
  const revision=Number(event.settingsRevision)||1,identity=RetroCloud.binding(c)+'|'+revision;
  const saved=await store.getAux('cloud-event-applied');
  if(!force&&(identity===cloudEventApplied||saved?.identity===identity)){
   cloudEventApplied=identity;return false;
  }
  const remote=event.settings||{};
  const next=C.safeSettings({...settings,...remote,title:event.title,showEnabled:event.showEnabled===true});
  if(!store.available)throw new Error('Event settings cannot persist on this device.');
  await store.setSettings(next);
  // Keep the same event identity after any async storage write; never apply a stale poll.
  if(RetroCloud.binding(cloudClient.connection)!==RetroCloud.binding(c))throw new Error('Cloud device changed during settings sync.');
  settings=next;renderer.settings=settings;renderState();syncForm();previewDesign();
  await store.setAux('cloud-event-applied',{identity,appliedAt:Date.now()});cloudEventApplied=identity;
  log('cloud_event_settings_applied',{revision,fields:Object.keys(remote),eventIdPrefix:c.eventId.slice(0,8)});
  renderCloud();return true;
 }finally{cloudEventSyncBusy=false;}
}
function renderCloudManaged(){
 const connected=!!cloudClient?.connection;
 const managed=['eventTitle','eventDate','duration','countdownSetting','ticketCaptureSecond','ticketPhotoAspect','receiptStyle','ticketOrientation','receiptCaption','receiptFooter','panelMakerInput','panelProductInput','panelSubtitleInput','panelChannelInput','qrDisplaySeconds','showDelay','showEnabled','lookMode'];
 for(const id of managed){const node=$(id);if(node){node.disabled=connected;node.title=connected?'Cloud Event Master: change this field from Hostinger Cloud Admin, then sync.':'';}}
 document.querySelectorAll('input[name=screenStyle]').forEach(node=>{node.disabled=connected;});
 const notice=$('cloudMasterNotice');if(notice)notice.textContent=connected?'EVENT SETTINGS MANAGED BY CLOUD · idle sync every 15 seconds. Hardware inputs and printer stay local.':'LOCAL ONLY · event settings can be edited on this device.';
}
async function setupCloud(){
 if(!store.getAux||!store.available){$('cloudStatus').textContent='Persistent storage unavailable. Cloud remains disabled; demo UI still works.';return;}
 cloudClient=new RetroCloud.Client({store,list:()=>store.list(),change:changeClip,purge:purgeCloudClip,canRun:()=>ready&&tabAllowed&&surfaceRole==='booth'&&state==='idle'&&!settingsSaving&&!cloudClaimBusy&&!document.hidden,onStatus:renderCloud});
 try{await cloudClient.init();renderCloudManaged();}catch(e){cloudClient.error=e.message;renderCloud();}
 async function action(fn){if(state!=='idle'||settingsSaving||cloudClaimBusy){toast('Finish the current session first.');return;}const buttons=$('cloudCard').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);settingsSaving=true;renderState();try{await fn();}catch(e){cloudClient.error=e.message;toast(e.message);}finally{settingsSaving=false;buttons.forEach(b=>b.disabled=false);renderState();renderCloud();}}
 $('cloudConnect').onclick=()=>action(async()=>{const raw=JSON.parse($('cloudBundle').value);const cfg=RetroCloud.config(raw);await authorizeNativeCloud(cfg.serverOrigin);const proof=await cloudClient.connect(cfg);$('cloudBundle').value='';renderCloudManaged();await pullCloudEvent(true,proof.event);toast('Cloud verified. Cloud Event Master settings applied.');});
 $('cloudRefill').onclick=()=>action(()=>cloudClient.refill());
 $('cloudDisable').onclick=()=>action(async()=>{await cloudClient.disable();cloudEventApplied='';renderCloudManaged();});
 $('cloudSyncEvent').onclick=()=>action(async()=>{const event=await cloudClient.verifyEvent();await pullCloudEvent(true,event);});
 $('cloudRetry').onclick=async()=>{if(state!=='idle'||settingsSaving)return;for(const clip of clips.filter(c=>c.cloud))await cloudClient.patch(clip.id,{retryAt:0,lastCheck:0});cloudClient.error='';await cloudClient.tick();};
 cloudTimer=setInterval(()=>cloudClient.tick().catch(e=>{cloudClient.error=e.message;renderCloud();}),2000);
 cloudEventPoll=setInterval(()=>pullCloudEvent().catch(e=>{cloudClient.error='Event settings: '+e.message;renderCloud();}),15000);
 if(cloudClient.connection)pullCloudEvent().catch(e=>{cloudClient.error='Event settings: '+e.message;renderCloud();});
 window.addEventListener('online',()=>{cloudClient.lastRefill=0;cloudClient.tick().catch(()=>{});pullCloudEvent().catch(()=>{});});
}
