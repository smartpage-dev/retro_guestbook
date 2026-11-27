/* Continuous kiosk and LOCAL guest/show proof. Not an authentication boundary. */
  let draftLogo='', designGeneration=0, guestId=null, guestURL=null, guestLoadedId=null;
  let showClipId=null,showURL=null,showTimer=null,showSound=false,lastShowId=null;
  let deleteTarget=null,deleteOrigin=null,deleteBusy=false,refreshBusy=false,refreshGeneration=0;
  const memoryTombstones=new Map();let channel=null;
  try{if(window.BroadcastChannel)channel=new BroadcastChannel('luce-retrobooth-v05-updates');}catch{}
  function designForm(){return {
    countdown:Number($('countdownSetting').value),returnSeconds:Number($('returnSeconds').value),
    receiptStyle:$('receiptStyle').value,ticketOrientation:$('ticketOrientation').value,ticketCaptureSecond:Number($('ticketCaptureSecond').value),ticketPhotoAspect:$('ticketPhotoAspect').value,receiptCaption:$('receiptCaption').value,receiptFooter:$('receiptFooter').value,
    logoData:draftLogo,showEnabled:$('showEnabled').checked,showDelay:Number($('showDelay').value)
  };}
  async function previewDesign(){
    const gen=++designGeneration;
    const draft=C.safeSettings({...settings,...designForm(),title:$('eventTitle').value,date:$('eventDate').value,receipt:$('receiptMode').value});
    try{
      await Receipt.prepare(draft);if(gen!==designGeneration)return;
      const result=Receipt.render($('designCanvas'),sample,renderer.snapshot(),draft);
      $('designDimensions').textContent=result.width+'px web design / '+result.orientation+' / '+(result.native58mmCompatible?'58mm portrait photo + QR pilot':'LANDSCAPE PREVIEW ONLY: 58mm native printer stays portrait, QR upright')+' / paper length estimate '+Math.round(result.estimatedLengthMm)+'mm';
    }catch(e){$('designDimensions').textContent='Preview failed: '+e.message;}
  }
  function announceChange(id){channel?.postMessage({type:'changed',id});}
  async function findClip(id){return store.available?store.getClip(id):(clips.find(c=>c.id===id)||memoryTombstones.get(id));}
  async function changeClip(id,update){
    const mutate=c=>({...update(c),privacyRevision:(c.privacyRevision||0)+1});
    let result;
    if(store.available)result=await store.mutateClip(id,mutate);
    else {const c=clips.find(c=>c.id===id);if(!c)throw new Error('This recording no longer exists.');result=mutate(c);}
    refreshGeneration++;
    clips=clips.filter(c=>c.id!==id);if(result.lifecycle!=='deleted')clips.push(result);else memoryTombstones.set(id,result);
    if(result.lifecycle==='deleted'&&printerClient?.available){
      try{await printerClient.call('revoke',{clipId:id});}catch{toast('Recording deleted; native printer revocation is pending. Disconnect the printer before further use.');}
    }
    announceChange(id);reconcileShow();reconcileDelivery();renderState();return result;
  }
  function clearGuestMedia(){
    $('guestVideo').pause();$('guestVideo').removeAttribute('src');$('guestVideo').load();
    $('guestVideo').hidden=true;$('guestImage').hidden=true;$('guestImage').removeAttribute('src');
    if(guestURL)URL.revokeObjectURL(guestURL);guestURL=null;guestLoadedId=null;
  }
  async function openGuest(id){
    if(busy())return;guestId=id;go('guest');
    try{const clip=await findClip(id);if(guestId!==id||currentView!=='guest')return;renderGuest(clip);}
    catch(e){clearGuestMedia();$('guestControls').hidden=true;$('guestMessage').textContent='Could not read local data. No change has been confirmed.';}
  }
  function renderGuest(clip){
    const gone=clip?.lifecycle==='deleted',missing=!clip;
    $('guestControls').hidden=gone||missing;$('guestMedia').hidden=gone||missing;
    if(gone||missing){clearGuestMedia();$('guestTitle').textContent=gone?'\u7559\u8a00\u5df2\u522a\u9664':'\u6b64\u700f\u89bd\u5668\u627e\u4e0d\u5230\u7559\u8a00';$('guestEvent').textContent='';$('guestStatus').textContent=gone?'DELETED / LOCAL COPY REMOVED':'NOT AVAILABLE HERE';$('guestMessage').textContent=gone?'\u5df2\u5f9e\u6b64\u700f\u89bd\u5668\u79fb\u9664\u5f71\u7247\u540c\u76f8\u7247\uff0c\u4ea6\u4e0d\u6703\u5728\u672c\u6a5f\u9810\u89bd\u518d\u64ad\u653e\u3002':'This local prototype does not deliver clips to other phones. Nothing has been uploaded.';return;}
    $('guestTitle').textContent='\u4f60\u5605\u4e00\u6bb5\u56de\u61b6';$('guestEvent').textContent=clip.title+' / MESSAGE '+String(clip.seq).padStart(3,'0');
    if(guestLoadedId!==clip.id){
      clearGuestMedia();guestLoadedId=clip.id;
      if(clip.blob){guestURL=URL.createObjectURL(clip.blob);$('guestVideo').src=guestURL;$('guestVideo').hidden=false;}
      else{$('guestImage').src=clip.thumbnail;$('guestImage').hidden=false;}
    }
    $('guestDownload').hidden=!clip.blob;
    $('guestMessage').textContent=clip.blob?'\u53ef\u4ee5\u5728\u9019\u88e1\u91cd\u6eab\u3001\u4e0b\u8f09\uff0c\u6216\u7ba1\u7406\u4f60\u7684\u7559\u8a00\u3002':'\u6d41\u7a0b\u793a\u7bc4\u7559\u8a00\uff0c\u6c92\u6709\u771f\u5be6\u5f71\u7247\u6216\u6536\u97f3\u3002';
    $('guestStatus').textContent=clip.guestPermission==='allow'?(C.publicEligible(clip,settings)?'ALLOWED / ELIGIBLE FOR LOCAL SHOW':'ALLOWED / WAITING FOR APPROVAL OR HOLD'):(clip.guestPermission==='hidden'?'HIDDEN FROM LIVE SHOW / PRIVATE COPY KEPT':'PRIVATE / NOT IN LIVE SHOW');
    $('guestHide').disabled=clip.guestPermission==='hidden';$('guestAllow').disabled=clip.guestPermission==='allow';
  }
  async function setGuestPermission(value){
    if(!guestId)return;
    $('guestHide').disabled=true;$('guestAllow').disabled=true;
    try{const original=await findClip(guestId);if(original?.cloud)await cloudClient.permission(original,value);const updated=await changeClip(guestId,c=>({...c,guestPermission:value}));renderGuest(updated);toast(value==='hidden'?'\u5df2\u96b1\u85cf\u5927\u5c4f\u5e55\u64ad\u653e\uff1b\u79c1\u4eba\u5f71\u7247\u4ecd\u7136\u4fdd\u7559\u3002':'\u5df2\u5141\u8a31\u5927\u5c4f\u5e55\u64ad\u653e\uff0c\u4ecd\u9700\u901a\u904e\u5de5\u4f5c\u4eba\u54e1\u6279\u51c6\u3002');}
    catch(e){toast('Change NOT saved: '+e.message);await openGuest(guestId);}
  }
  function requestDelete(id,origin){
    if(busy())return;deleteTarget=id;deleteOrigin=origin;$('deleteAck').checked=false;$('deleteConfirm').disabled=true;$('deleteError').textContent='';
    const isCloud=clips.find(c=>c.id===id)?.cloud;
    $('deleteWarning').textContent='\u522a\u9664\u5f8c\u7121\u6cd5\u91cd\u6eab\u6216\u4e0b\u8f09\uff0c\u4ea6\u6703\u5f9e\u672c\u6a5f\u5927\u5c4f\u5e55\u9810\u89bd\u79fb\u9664\u3002\u53ea\u4fc2\u5514\u60f3\u516c\u958b\u64ad\u653e\uff1f\u8acb\u53d6\u6d88\u4e26\u6539\u9078 Hide from live show\u3002';
    if(isCloud)$('deleteWarning').textContent='Delete revokes this cloud recording and then removes the local media. An online connection is required here. Downloaded files and independent backups cannot be recalled. To keep the recording private, cancel and use Hide from live show.';
    $('deleteDialog').showModal();
  }
  async function confirmDelete(){
    if(!deleteTarget||!$('deleteAck').checked||deleteBusy)return;deleteBusy=true;$('deleteConfirm').disabled=true;$('deleteCancel').disabled=true;
    const id=deleteTarget;
    try{
      const original=await findClip(id);if(original?.cloud){await cloudClient.remove(original);await purgeCloudClip(original);}
      await changeClip(id,c=>({id:c.id,seq:c.seq,createdAt:c.createdAt,lifecycle:'deleted',guestPermission:'private',moderation:'pending',deletedAt:new Date().toISOString(),privacyRevision:c.privacyRevision}));
      if(sessionId===id){snapshots=[];snapIndex=0;}
      if(lastReceipt?.clip.id===id){lastReceipt=null;$('receiptCanvas').getContext('2d').clearRect(0,0,384,$('receiptCanvas').height);$('receiptDownload').disabled=true;$('receiptStatus').textContent='Deleted / receipt media removed';}
      if(selectedClip?.id===id){selectedClip=null;if($('clipDialog').open)$('clipDialog').close();}
      $('deleteDialog').close();deleteTarget=null;
      if(deleteOrigin==='guest')await openGuest(id);else renderLibrary();
      toast('Recording removed from this browser. Configured cloud deletion is requested first; downloaded copies cannot be recalled.');
    }catch(e){$('deleteError').textContent='Deletion NOT completed: '+e.message;$('deleteConfirm').disabled=false;}
    finally{deleteBusy=false;$('deleteCancel').disabled=false;}
  }
  function clearShow(){
    clearTimeout(showTimer);showTimer=null;$('showVideo').pause();$('showVideo').removeAttribute('src');$('showVideo').load();$('showVideo').hidden=true;
    $('showImage').hidden=true;$('showImage').removeAttribute('src');
    if(showURL)URL.revokeObjectURL(showURL);showURL=null;showClipId=null;$('showMessage').textContent='';
  }
  function eligibleClips(){return clips.filter(c=>!c.cloud&&C.publicEligible(c,settings)).sort((a,b)=>a.seq-b.seq);}
  function reconcileShow(){
    if(currentView!=='show')return;
    $('showEvent').textContent=settings.title;
    const eligible=eligibleClips();$('showStatus').textContent=eligible.length+' eligible / PRIVATE UNTIL ALLOWED + APPROVED';
    if(showClipId&&!eligible.some(c=>c.id===showClipId))clearShow();
    $('showEmpty').hidden=eligible.length>0;
    if(!eligible.length){$('showEmpty').querySelector('p').textContent=settings.showEnabled?'Waiting for guest permission, staff approval and the minimum hold.':'Show is OFF in Control room. No clips are public.';return;}
    if(!showClipId)nextShow();
  }
  function nextShow(){
    if(currentView!=='show')return;clearShow();const eligible=eligibleClips();
    if(!eligible.length){reconcileShow();return;}
    const idx=eligible.findIndex(c=>c.id===lastShowId);const clip=eligible[(idx+1)%eligible.length];showClipId=clip.id;lastShowId=clip.id;
    $('showEmpty').hidden=true;$('showMessage').textContent=clip.kind==='demo'?'DEMO STILL / NO RECORDED VIDEO':'';
    if(clip.blob){showURL=URL.createObjectURL(clip.blob);$('showVideo').src=showURL;$('showVideo').hidden=false;$('showVideo').muted=!showSound;
      $('showVideo').play().catch(()=>{$('showMessage').textContent='Playback needs a browser gesture. Use Sound or Fullscreen.';});
    }else{$('showImage').src=clip.thumbnail;$('showImage').hidden=false;}
    showTimer=setTimeout(nextShow,clip.blob?Math.min(65000,clip.durationMs+5000):6000);
  }
  async function refreshShared(){
    if(!store.available||refreshBusy)return;refreshBusy=true;const gen=refreshGeneration;
    try{const rows=await store.list(),config=await store.getSettings();
      if(gen!==refreshGeneration)return;clips=rows.filter(c=>c.lifecycle!=='deleted');
      if(config?.value&&state==='idle'&&!settingsSaving){settings=C.safeSettings(config.value);renderer.settings=settings;}
      if(currentView==='guest'&&guestId)renderGuest(rows.find(c=>c.id===guestId));
      if(lastReceipt?.clip.seq>0&&!clips.some(c=>c.id===lastReceipt.clip.id)){
        lastReceipt=null;$('receiptCanvas').getContext('2d').clearRect(0,0,384,$('receiptCanvas').height);$('receiptDownload').disabled=true;$('receiptStatus').textContent='Deleted / receipt media removed';
      }
      if(selectedClip&&!clips.some(c=>c.id===selectedClip.id)){selectedClip=null;if($('clipDialog').open)$('clipDialog').close();}
      if(currentView==='library')renderLibrary();reconcileShow();reconcileDelivery();renderState();
    }catch(e){if(currentView==='show'){clearShow();$('showEmpty').hidden=false;$('showStatus').textContent='Permission refresh failed / playback stopped.';}log('privacy_refresh_failed',{error:e.message});}
    finally{refreshBusy=false;}
  }
  function setupExperience(){
    // Labels are explicit: hiding retains private media; deletion does not.
    const strings={guestHide:'\u4e0d\u5728\u5927\u5c4f\u5e55\u64ad\u653e / Hide',guestAllow:'\u5141\u8a31\u5927\u5c4f\u5e55\u64ad\u653e',guestVisibilityTitle:'\u5927\u5c4f\u5e55\u64ad\u653e\u8a2d\u5b9a',guestVisibilityHelp:'\u96b1\u85cf\u53ea\u6703\u505c\u6b62\u516c\u958b\u8f2a\u64ad\u3002\u4f60\u4ecd\u53ef\u4ee5\u91cd\u6eab\u540c\u4e0b\u8f09\uff0c\u4e3b\u8fa6\u4eba\u4ea6\u4ecd\u4fdd\u7559\u79c1\u4eba\u7559\u8a00\u3002',guestDeleteTitle:'\u522a\u9664\u7559\u8a00',guestDeleteHelp:'\u5514\u60f3\u4fdd\u7559\u5462\u6bb5\u7247\uff1f\u522a\u9664\u9700\u8981\u518d\u6b21\u78ba\u8a8d\uff0c\u5b8c\u6210\u5f8c\u7121\u6cd5\u5fa9\u539f\u3002',guestDelete:'\u522a\u9664\u9019\u6bb5\u7559\u8a00',deleteHeading:'\u78ba\u5b9a\u8981\u522a\u9664\u9019\u6bb5\u7559\u8a00\uff1f',deleteAckLabel:'\u6211\u660e\u767d\u522a\u9664\u5f8c\u7121\u6cd5\u5fa9\u539f\u3002',deleteCancel:'\u53d6\u6d88\uff0c\u4fdd\u7559\u7559\u8a00',deleteConfirm:'\u78ba\u5b9a\u522a\u9664',guestDownload:'\u4e0b\u8f09\u5f71\u7247'};
    Object.entries(strings).forEach(([id,text])=>$(id).textContent=text);
    $('guestHide').onclick=()=>setGuestPermission('hidden');$('guestAllow').onclick=()=>setGuestPermission('allow');
    $('guestDelete').onclick=()=>requestDelete(guestId,'guest');$('guestDownload').onclick=async()=>{const c=await findClip(guestId);if(c?.lifecycle!=='deleted')downloadClip(c);};
    $('deleteAck').onchange=()=>$('deleteConfirm').disabled=!$('deleteAck').checked;
    $('deleteCancel').onclick=()=>{if(!deleteBusy){deleteTarget=null;$('deleteDialog').close();}};
    $('deleteDialog').addEventListener('cancel',e=>{if(deleteBusy)e.preventDefault();else deleteTarget=null;});$('deleteConfirm').onclick=confirmDelete;
    ['receiptStyle','ticketOrientation','receiptCaption','receiptFooter','receiptMode','eventTitle','eventDate','ticketPhotoAspect'].forEach(id=>$(id).addEventListener('input',previewDesign));
    $('logoFile').onchange=async()=>{
      const file=$('logoFile').files[0];if(!file)return;
      if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024){toast('Choose a PNG/JPEG no larger than 2 MB.');return;}
      const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(!image.width||image.width*image.height>40000000)throw new Error('Image dimensions are too large.');const c=document.createElement('canvas');const scale=Math.min(1,300/image.width,100/image.height);c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);draftLogo=c.toDataURL('image/png');await previewDesign();}catch(e){toast('Logo not loaded: '+e.message);}finally{URL.revokeObjectURL(url);$('logoFile').value='';}
    };
    $('removeLogo').onclick=()=>{draftLogo='';previewDesign();};
    $('showVideo').onended=nextShow;
    $('showSound').onclick=()=>{showSound=!showSound;$('showVideo').muted=!showSound;$('showSound').textContent='Sound: '+(showSound?'ON':'OFF');if(showClipId&&!$('showVideo').hidden)$('showVideo').play().catch(()=>{});};
    $('showFullscreen').onclick=()=>document.documentElement.requestFullscreen?.().catch(e=>toast(e.message));
    let taps=0,tapTimer;$('staffEntry').onclick=()=>{taps++;clearTimeout(tapTimer);tapTimer=setTimeout(()=>taps=0,2200);if(taps>=5){taps=0;go('admin');}};
    if(channel)channel.onmessage=e=>{
      if(e.data?.type!=='changed')return;
      refreshGeneration++; // Reject a read started before this privacy change.
      if(e.data.id&&e.data.id===showClipId)clearShow();
      if(e.data.id&&e.data.id===guestLoadedId)clearGuestMedia();
      refreshShared();
    };
    setInterval(()=>{if(['show','guest','library'].includes(currentView))refreshShared();if(currentView==='show'&&!store.available)reconcileShow();},1500);
    $('privacyNoticeCompact').textContent="\u7559\u8a00\u4f9b\u4e3b\u8fa6\u4eba\u4fdd\u5b58\uff1b\u5927\u5c4f\u5e55\u64ad\u653e\u9700\u53e6\u884c\u5141\u8a31\u3002\u5148\u5b58\u672c\u6a5f\uff1b\u96f2\u7aef\u6309 Admin \u8a2d\u5b9a\u555f\u7528\u3002\u6253\u5370\u672a\u9023\u63a5\u3002";
  }
