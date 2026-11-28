  const usbClient=window.RetroBackupNative?.postMessage&&window.RetroBackup?.RetroBackupClient
      ?new window.RetroBackup.RetroBackupClient(window.RetroBackupNative):null;
  let usbInfo={available:!!usbClient,configured:false,ready:false,enabled:false};
  let usbLedger={},usbWorking=false,usbWakeTimer=null,usbLastFailure=0,usbManualVerification=null,usbScope=null;
  // Data minimization: never silently copy a previous client's event to a newly chosen USB.
  const usbScopeReady=()=>!!(usbScope&&usbInfo.folderKey&&usbScope.folderKey===usbInfo.folderKey&&Number.isFinite(usbScope.sinceAt));
  const usbSameEvent=()=>usbScopeReady()&&usbScope.eventTitle===String(settings.title||'')&&usbScope.eventDate===String(settings.date||'');
  const usbAllSaved=()=>clips.filter(x=>window.RetroBackup?.isSaved(x));
  const usbInScope=(clip,since)=>usbScopeReady()&&window.RetroBackup.isSaved(clip)&&
    String(clip.title||'')===usbScope.eventTitle&&String(clip.eventDate||'')===usbScope.eventDate&&
    Number.isFinite(Date.parse(clip.createdAt))&&Date.parse(clip.createdAt)>=since;
  const usbSavedClips=()=>clips.filter(c=>usbInScope(c,usbScope?.sinceAt));
  const usbKey=(clip)=>window.RetroBackup.key(usbInfo.folderKey||'',clip);
  function usbLocalDateTime(ms){
    const d=new Date(ms),two=n=>String(n).padStart(2,'0');
    return d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate())+'T'+two(d.getHours())+':'+two(d.getMinutes());
  }
  async function usbNewScope(folderKey){
    if(!store.available)throw new Error('Local database is required to save the event backup scope.');
    if(usbScope?.folderKey===folderKey)return; // same USB keeps its existing event boundary
    const chosen={folderKey,sinceAt:Date.now(),eventTitle:String(settings.title||''),eventDate:String(settings.date||'')};
    await store.setAux('usb-backup-scope-v1',chosen);usbScope=chosen;
    $('usbBackupSince').value=usbLocalDateTime(chosen.sinceAt);
    usbManualVerification=null;
    log('usb_event_scope_created',{folder:folderKey,eventDate:chosen.eventDate,newClipsOnly:true});
  }
  async function usbIncludeEarlier(){
    if(!usbScopeReady()||usbWorking||state!=='idle')return;
    const proposed=Date.parse($('usbBackupSince').value);
    if(!Number.isFinite(proposed)||proposed>Date.now()){usbProgress('Choose a valid event starting time, not in the future.');return;}
    if(proposed>usbScope.sinceAt){
      usbProgress('Cannot narrow a USB scope after copying: existing files would remain. Use a NEW event folder.');
      return;
    }
    const extra=clips.filter(c=>usbInScope(c,proposed)&&!usbInScope(c,usbScope.sinceAt));
    const existing=usbSavedClips().length;
    if(!extra.length){usbProgress('No earlier clips match this event title/date and time. Other event clips remain excluded.');return;}
    const earliest=new Date(Math.min(...extra.map(c=>Date.parse(c.createdAt)))).toLocaleString();
    if(!confirm('INCLUDE EARLIER VIDEOS ON CLIENT USB?\nEvent: '+usbScope.eventTitle+' / '+usbScope.eventDate+'\nEarlier matching clips: '+extra.length+' (earliest '+earliest+')\nTotal selected clips: '+(existing+extra.length)+'\n\nCheck these recordings belong to THIS client. Older USB files are never automatically deleted.'))return;
    const adjusted={...usbScope,sinceAt:proposed};
    await store.setAux('usb-backup-scope-v1',adjusted);usbScope=adjusted;
    usbManualVerification=null;usbLastFailure=0;usbPaint();usbSchedule();
    usbProgress('Included '+extra.length+' earlier current-event clips. Review totals and Copy pending clips.');
    log('usb_event_scope_extended',{folder:usbInfo.folderKey,added:extra.length,total:existing+extra.length});
  }
  function usbCounts(){
    const real=usbSavedClips(),verified=real.filter(c=>usbLedger[usbKey(c)]?.status==='verified').length;
    return {real,verified,pending:real.length-verified,failed:real.filter(c=>usbLedger[usbKey(c)]?.status==='failed').length};
  }
  function usbPaint(){
    const count=usbCounts(),configured=!!usbInfo.configured,ready=!!usbInfo.ready,on=!!usbInfo.enabled;
    const scoped=usbScopeReady(),excluded=usbAllSaved().length-count.real.length,matching=usbSameEvent();
    $('usbBackupScope').textContent=!scoped?'NO EVENT SCOPE — Choose this USB folder again to start a fresh event boundary. No old videos will be copied.':
      'SELECTED EVENT: '+usbScope.eventTitle+' / '+usbScope.eventDate+' · From '+new Date(usbScope.sinceAt).toLocaleString()+' · '+count.real.length+' eligible, '+excluded+' other local clip(s) excluded.'+
      (matching?'':' CURRENT EVENT SETTINGS DIFFER — automatic backup is paused for safety.');
    $('usbBackupVerified').textContent=count.verified+' / '+count.real.length;
    $('usbBackupPending').textContent=String(count.pending);$('usbBackupFailed').textContent=String(count.failed);
    $('usbBackupFolder').textContent=configured?'Selected: '+(usbInfo.folderName||'Unavailable')+(usbInfo.folderKey?' · ID '+usbInfo.folderKey.slice(0,8):''):'No destination selected · 請先選 USB 活動資料夾';
    $('usbBackupStatus').textContent=!usbClient?'ANDROID APP ONLY — Browser and Windows versions cannot auto-write USB folders.':
       !configured?'NOT CONFIGURED — Choose an Android folder/USB drive.':
       !ready?'USB OFFLINE / FOLDER UNAVAILABLE — Reconnect and refresh; originals are safe in app.':
       !scoped?'SCOPE REQUIRED — Re-select this folder; previous-event videos are excluded by default.':
       !matching?'EVENT CHANGED — Previous event USB scope remains; new clips are not auto-copied. Use a NEW USB event folder.':
       !on?'PAUSED — Folder permission retained. Existing USB files are unchanged.':
       usbWorking?'COPY/VERIFY IN PROGRESS — Do not remove USB until complete.':
       count.real.length===0?'NO CLIPS IN EVENT SCOPE — Old client videos excluded; set event start time to include earlier clips.':
       count.pending===0?'ALL SCOPED CLIPS WERE VERIFIED WHEN COPIED — Run Verify all before hand-off.':
       count.failed>0?'BACKUP ATTENTION — '+count.failed+' error(s). Check USB and retry.':
       'AUTO BACKUP ON — '+count.pending+' saved recording(s) waiting for idle copy.';
    const control=!!usbClient&&!usbWorking&&state==='idle';
    $('usbBackupChoose').disabled=!control;
    $('usbBackupToggle').disabled=!control||!configured||!scoped;
    $('usbBackupSince').disabled=!control||!scoped;
    $('usbBackupApplyScope').disabled=!control||!scoped;
    $('usbBackupToggle').textContent=on?'Pause auto backup / 暫停':'Resume auto backup / 繼續';
    $('usbBackupCopy').disabled=!control||!ready||!on||count.pending===0;
    $('usbBackupVerify').disabled=!control||!ready||!on||count.real.length===0;
    $('usbBackupRefresh').disabled=!control;
    $('usbBackupForget').disabled=!control||!configured;
    const recent=$('usbBackupRecent');recent.replaceChildren();
    for(const clip of count.real.slice().reverse().slice(0,6)){
      const entry=usbLedger[usbKey(clip)],p=document.createElement('p');
      p.textContent='CLIP '+String(clip.seq).padStart(3,'0')+' · '+(entry?.status==='verified'?'VERIFIED':entry?.status==='failed'?'FAILED — '+String(entry.error||'Unknown error').slice(0,125):'PENDING');
      recent.append(p);
    }
    if(usbManualVerification){const p=document.createElement('p');p.textContent=usbManualVerification;recent.prepend(p);}
  }
  function usbProgress(message,ratio=null){
    $('usbBackupProgressLabel').textContent=message;
    $('usbBackupProgress').hidden=ratio===null;
    if(ratio!==null)$('usbBackupProgress').value=Math.max(0,Math.min(100,ratio));
  }
  async function usbPersist(clip,status,error=''){
    if(!store.available)throw new Error('Local IndexedDB is unavailable; cannot store durable USB backup progress.');
    usbLedger[usbKey(clip)]={status,error:error.slice(0,300),name:window.RetroBackup.fileNameFor(clip),bytes:clip.blob.size,at:new Date().toISOString()};
    await store.setAux('usb-backup-ledger-v1',usbLedger); // persisted, keyed by selected folder + original clip id
    usbPaint();
  }
  function usbCanRun(){return !!usbClient&&!!store.available&&usbScopeReady()&&usbInfo.ready&&usbInfo.enabled&&state==='idle'&&document.visibilityState==='visible';}
  function usbSchedule(delay=1500){
    if(usbWakeTimer)clearTimeout(usbWakeTimer);
    if(!usbCanRun()||!usbSameEvent()||usbWorking||usbCounts().pending===0)return;
    usbWakeTimer=setTimeout(()=>{
       usbWakeTimer=null;
       if(Date.now()-usbLastFailure<60000)return;
       void usbRun(false);
    },delay);
  }
  async function usbReload(){
    if(!usbClient){usbPaint();return;}
    const response=await usbClient.status();usbInfo=response;usbPaint();return response;
  }
  async function usbRun(manual=false){
    if(!usbCanRun()||usbWorking){usbPaint();return;}
    if(!manual&&(!usbSameEvent()||Date.now()-usbLastFailure<60000))return;
    usbWorking=true;usbManualVerification=null;usbPaint();let copied=0;
    try{
      // Iterate an immutable snapshot. A new clip saved while we copy is picked up at next idle.
      const queue=usbSavedClips().filter(c=>usbLedger[usbKey(c)]?.status!=='verified').sort((a,b)=>a.seq-b.seq);
      for(const clip of queue){
        if(!usbCanRun())break;
        const filename=window.RetroBackup.fileNameFor(clip);
        usbProgress('COPYING '+filename+' · '+(copied+1)+' / '+queue.length,0);
        try{
          const result=await usbClient.copy(clip,(bytes,total)=>usbProgress('COPY '+filename+' · '+(bytes/1048576).toFixed(1)+' / '+(total/1048576).toFixed(1)+' MiB',100*bytes/total),()=>usbCanRun());
          if(!result.verified)throw new Error('Native file verification was not completed.');
          await usbPersist(clip,'verified');usbLastFailure=0;copied++;usbProgress('VERIFIED '+filename+' · original retained',100);
          log('usb_backup_verified',{clip:clip.id,bytes:result.bytes,folder:usbInfo.folderKey,alreadyPresent:!!result.alreadyVerified});
        }catch(e){
          const paused=/postponed until booth is idle/.test(e.message);
          if(!paused){try{await usbPersist(clip,'failed',e.message);}catch(err){log('usb_backup_ledger_failure',{error:err.message});}
            usbLastFailure=Date.now();usbProgress('USB COPY FAILED: '+e.message);log('usb_backup_failed',{clip:clip.id,error:e.message});}
          else usbProgress('USB copy paused for guest recording; original is safe.');
          break; // do not hammer a disconnected/full USB with every recording
        }
      }
      if(manual&&copied)toast(copied+' clip(s) copied and verified on USB.');
    }finally{usbWorking=false;usbPaint();if(!usbLastFailure&&usbCanRun())usbSchedule(2000);}
  }
  async function usbVerifyAll(){
    if(!usbCanRun()||usbWorking)return;
    usbWorking=true;usbManualVerification=null;usbPaint();const real=usbSavedClips();let good=0,missing=0;
    try{
      for(const clip of real){
        if(!usbCanRun()){usbProgress('Verification interrupted; repeat before giving away USB.');return;}
        usbProgress('VERIFYING '+(good+missing+1)+' / '+real.length+' · '+window.RetroBackup.fileNameFor(clip),100*(good+missing)/real.length);
        try{await usbClient.verify(clip);await usbPersist(clip,'verified');good++;}
        catch(e){missing++;try{await usbPersist(clip,'failed',e.message);}catch(err){log('usb_backup_ledger_failure',{error:err.message});}
          log('usb_verify_failed',{clip:clip.id,error:e.message});}
      }
      usbManualVerification='LAST FULL CHECK '+new Date().toLocaleString()+' · VERIFIED '+good+'/'+real.length+(missing?' · '+missing+' MISSING/INVALID. DO NOT HAND OVER.':' · ALL SHA-256 OK. Check playback on a separate computer.');
      usbProgress(usbManualVerification,100);toast(missing?'USB incomplete. Retry missing/invalid clips before hand-off.':'All '+good+' USB video copies verified. Test playback before handing it over.');
    }finally{usbWorking=false;usbPaint();}
  }
  async function usbAction(task){
    if(!usbClient||usbWorking||state!=='idle')return;
    usbWorking=true;usbPaint();
    try{const result=await task();if(result)usbInfo=result;
      else await usbReload();usbLastFailure=0;usbManualVerification=null;usbPaint();usbSchedule();}
    catch(e){usbProgress('USB: '+e.message);toast(e.message);}
    finally{usbWorking=false;usbPaint();usbSchedule();}
  }
  async function setupBackup(){
    try{usbLedger=await store.getAux('usb-backup-ledger-v1')||{};if(!usbLedger||typeof usbLedger!=='object'||Array.isArray(usbLedger))usbLedger={};}
    catch(e){usbLedger={};log('usb_ledger_read_failed',{error:e.message});}
    try{const saved=await store.getAux('usb-backup-scope-v1');
      if(saved&&typeof saved.folderKey==='string'&&typeof saved.eventTitle==='string'&&typeof saved.eventDate==='string'&&Number.isFinite(saved.sinceAt)){
        usbScope=saved;$('usbBackupSince').value=usbLocalDateTime(saved.sinceAt);
      }}catch(e){log('usb_scope_read_failed',{error:e.message});}
    $('usbBackupChoose').onclick=()=>usbAction(async()=>{const next=await usbClient.select();if(next.folderKey)await usbNewScope(next.folderKey);return next;});
    $('usbBackupToggle').onclick=()=>usbAction(()=>usbInfo.enabled?usbClient.pause():usbClient.enable());
    $('usbBackupRefresh').onclick=()=>usbAction(async()=>{const next=await usbClient.status();return next;});
    $('usbBackupCopy').onclick=async()=>{try{usbLastFailure=0;await usbReload();await usbRun(true);}catch(e){usbProgress('USB backup: '+e.message);toast(e.message);}};
    $('usbBackupVerify').onclick=()=>void usbVerifyAll();
    $('usbBackupApplyScope').onclick=()=>void usbIncludeEarlier().catch(e=>{usbProgress('Scope: '+e.message);toast(e.message);});
    $('usbBackupForget').onclick=()=>{if(confirm('Forget the selected USB folder? Existing USB copies will NOT be deleted; original app videos stay.'))void usbAction(()=>usbClient.forget());};
    if(usbClient){try{await usbReload();}catch(e){usbProgress('USB bridge: '+e.message);log('usb_status_failed',{error:e.message});}}
    usbPaint();usbSchedule();
    // Detect a reinserted USB while idle, without any broad filesystem permission or tight polling.
    if(usbClient)setInterval(()=>{
      if(!usbWorking&&state==='idle'&&document.visibilityState==='visible')usbReload().then(()=>usbSchedule()).catch(e=>log('usb_status_failed',{error:e.message}));
    },90000);
  }
