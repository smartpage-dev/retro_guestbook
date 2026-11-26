/* Only bundled Android can connect SPP. The cloud server never talks to nearby Bluetooth. */
let printerClient=null,printerActionBusy=false;
function printerText(){const s=printerClient?.status;if(!printerClient?.available&&window.RetroDesktop)return 'Windows desktop / no native Bluetooth bridge. Photo + QR ticket printing is Android-only in this build. Screen QR remains available.';if(!printerClient?.available)return 'Browser / no native Bluetooth bridge. Build and install the Android v0.9.5 TEST APK for this pilot.';
 return (s.connected?'CONNECTED (transport only)':'DISCONNECTED')+' / '+(s.pinned||'no pinned device')+' / automatic '+(s.automaticEnabled?'ON':'OFF')+' / fast return '+(s.fastReturnArmed?'OPERATOR RISK ACCEPTED':'OFF; screen QR retained')+' / no electronic paper confirmation'+(s.error?' / '+s.error:'');}
function renderPrinter(){if(!$('printerStatus'))return;$('printerStatus').textContent=printerText();const available=!!printerClient?.available;
 for(const id of ['printerPermission','printerSettings','printerList','printerPin','printerConnect','printerTest','printerTestPhoto','printerEnableAuto','printerDisableAuto','printerManual','printerReprint','printerObserve','printerFastOff','printerRefresh'])$(id).disabled=!available||printerActionBusy;
 $('printerDisconnect').disabled=!available;
}
function refreshPrinterClips(){
 const selected=$('printerClip').value;$('printerClip').replaceChildren(new Option('Choose a saved cloud recording',''));
 for(const c of [...clips].sort((a,b)=>b.seq-a.seq)){try{RetroPrinter.guestTicket(c);$('printerClip').append(new Option('Message '+String(c.seq).padStart(3,'0')+' / '+new Date(c.createdAt).toLocaleString(),c.id));}catch{}}
 if([...$('printerClip').options].some(o=>o.value===selected))$('printerClip').value=selected;
}
async function refreshPrinter(){
 if(!printerClient?.available){renderPrinter();return;}
 try{await printerClient.refresh();const info=await printerClient.call('ledger');$('printerJournal').replaceChildren();
 for(const job of info.jobs||[]){const row=document.createElement('div');row.className='printer-job';const title=document.createElement('span');title.textContent=(job.kind==='test'?'DIAGNOSTIC':'Message '+job.label)+' / '+job.state+(job.parent?' / intentional reprint':'');const code=document.createElement('code');code.textContent=job.id;row.append(title,code);$('printerJournal').append(row);}
 }catch(e){$('printerNotice').textContent=e.message;}renderPrinter();
}
async function printerOperation(task){
 if(state!=='idle'||settingsSaving||cameraBusy||printerActionBusy||!['admin','library'].includes(currentView)){toast('Finish the current session before changing printer settings.');return;}
 printerActionBusy=true;renderState();renderPrinter();
 try{await task();}catch(e){$('printerNotice').textContent=e.message;toast(e.message);}finally{try{await refreshPrinter();}finally{printerActionBusy=false;renderState();renderPrinter();}}
}
async function printSavedGuest(id,reprint=false){
 const clip=await findClip(id);RetroPrinter.guestTicket(clip,reprint?clip.id:'');
 const result=await printerClient.send(clip,{reprint,waitMs:15000});
 await noteNativePrint(clip.id,result);$('printerObservedId').value=result.jobId;
 $('printerNotice').textContent='Ticket '+result.jobId+' / '+result.state+(result.duplicate?' / duplicate suppressed: nothing resent':'')+'. Paper output is NOT electronically confirmed.';
 return result;
}
async function noteNativePrint(id,r){
 try{await changeClip(id,c=>({...c,printState:r.state,printTicket:{jobId:r.jobId,state:r.state,transport:'android_secure_spp',paperConfirmed:false,duplicate:r.duplicate===true}}));}
 catch{log('print_browser_metadata_failed',{id});/* Native journal remains authoritative; never resend. */}
}
async function nativeGuestPrint(saved,ticket,waitMs){
 const handoff=deliveryContext,deadlineEpochMs=Date.now()+waitMs;const isCurrent=()=>deliveryContext===handoff&&state==='receipt'&&Date.now()<deadlineEpochMs;
 if(!printerClient?.available)return null;
 try{
  if(!isCurrent())return {...ticket,state:'timeout',simulated:false};
  const latest=await findClip(saved.id);if(!latest||latest.lifecycle==='deleted')throw new Error('Recording no longer available.');
  const r=await printerClient.send(latest,{automatic:true,waitMs,deadlineEpochMs,isCurrent});await noteNativePrint(saved.id,r);return r;
 }catch(e){log('native_ticket_unconfirmed',{clipId:saved.id});return {...ticket,state:'outcome_unknown',simulated:false};}
}
function setupPrinter(){
 printerClient=new RetroPrinter.Client();renderPrinter();refreshPrinterClips();
 const act=(id,fn)=>$(id).onclick=()=>printerOperation(fn);
 act('printerPermission',async()=>{await printerClient.call('permission',{},60000);});
 act('printerSettings',async()=>{await printerClient.call('settings');});
 act('printerList',async()=>{const data=await printerClient.call('list');$('printerDevice').replaceChildren(new Option('Choose the exact paired printer',''));for(const d of data.devices||[])$('printerDevice').append(new Option(d.name+' / '+d.address,d.address));if(data.pinned)$('printerDevice').value=data.pinned;});
 act('printerPin',async()=>{await printerClient.call('pin',{address:$('printerDevice').value},60000);});
 act('printerConnect',async()=>{await printerClient.call('connect');});
 $('printerDisconnect').onclick=async()=>{try{await printerClient.call('disconnect');}catch(e){toast(e.message);}await refreshPrinter();};
 act('printerEnableAuto',async()=>{await printerClient.call('automatic',{enabled:true},60000);});
 act('printerDisableAuto',async()=>{await printerClient.call('automatic',{enabled:false});});
 act('printerTest',async()=>{const r=await printerClient.call('test',{waitMs:15000},90000);$('printerNotice').textContent='QR-only diagnostic ticket '+r.jobId+' / '+r.state+'. TEST QR is NOT a video link and does not unlock fast return.';});
 act('printerTestPhoto',async()=>{if(!cameraReady())throw new Error('Apply Camera first in 02 / DEVICE CHECK before printing a LIVE photo.');const photo=RetroTicketPhoto.raster(renderer.snapshot());const r=await printerClient.call('test',{...photo,photoMoment:'TEST LIVE',waitMs:15000},90000);if(r?.photoIncluded!==true)throw new Error('Printer did not acknowledge the image layout. Inspect paper; do not automatically repeat.');$('printerNotice').textContent='LIVE photo + diagnostic QR test '+r.jobId+' / '+r.state+'. Inspect paper and scan the TEST QR; no real video link.';log('ticket_photo_test_sent',{state:r.state,bytes:r.bytes||0});});
 $('printerClipRefresh').onclick=()=>refreshPrinterClips();
 act('printerManual',async()=>{await printSavedGuest($('printerClip').value);});
 act('printerReprint',async()=>{await printSavedGuest($('printerClip').value,true);});
 act('printerObserve',async()=>{const scanned=$('printerScanned').value;$('printerScanned').value='';await printerClient.call('observe',{jobId:$('printerObservedId').value,scanned},90000);$('printerNotice').textContent='Operator-recorded scan matched. Fast-return acceptance is connection-bound, not a paper sensor.';});
 act('printerFastOff',async()=>{await printerClient.call('fastOff');});
 act('printerRefresh',async()=>{});
 $('printerBooth').onclick=()=>go('booth');
 window.addEventListener('retro-native-pause',()=>{if(printerClient)printerClient.pause();renderPrinter();});
 // No polling loop or reconnect service: avoid queuing stale requests during capture.
}
