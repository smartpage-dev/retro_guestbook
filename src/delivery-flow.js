/* Post-recording hand-off. Native QR transport is a separate adapter; capture and cloud ownership stay unchanged. */
let deliveryContext=null,deliveryTimer=null,deliveryEpoch=0,deliveryThanks='';
let sessionDeliveryScenario='not_connected';
function clearDelivery(){
  deliveryEpoch++;clearInterval(deliveryTimer);deliveryTimer=null;deliveryContext=null;deliveryThanks='';
  const canvas=$('deliveryQrCanvas');canvas.width=1;canvas.height=1;canvas.style.width='1px';canvas.style.height='1px';
  $('deliveryOverlay').hidden=true;
  for(const id of ['deliveryMessage','deliveryRef','deliverySeconds','deliveryReason'])$(id).textContent='';
}
function deliveryRemaining(){return deliveryContext?.deadline?RetroDelivery.remaining(deliveryContext.deadline,performance.now()):0;}
function deliveryStatus(){return {active:!!deliveryContext,clipId:deliveryContext?.ticket.clipId||null,
  remaining:deliveryRemaining(),route:deliveryContext?.route||null,reason:deliveryContext?.reason||null,
  simulated:deliveryContext?.simulated===true,hardware:printerClient?.available?'android_secure_spp_pilot':'not_connected',online:deliveryContext?.ticket.online===true};}
function renderDeliveryVisibility(){
  $('deliveryOverlay').hidden=state!=='qr'||currentView!=='booth'||document.hidden||!deliveryContext;
}
function drawDeliveryQr(){
  if(state!=='qr'||!deliveryContext)return;
  const c=$('deliveryQrCanvas'),box=$('deliveryQrBox').getBoundingClientRect();
  const q=new RetroQR(0,0);q.addData(deliveryContext.ticket.payload);q.make();
  const quiet=4,n=q.getModuleCount(),modules=n+quiet*2;
  const scale=Math.max(1,Math.floor(Math.min(box.width||360,box.height||360)/modules));
  const size=modules*scale;c.width=c.height=size;c.style.width=c.style.height=size+'px';
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#fff';x.fillRect(0,0,size,size);x.fillStyle='#000';
  for(let y=0;y<n;y++)for(let col=0;col<n;col++)if(q.isDark(y,col))x.fillRect((col+quiet)*scale,(y+quiet)*scale,scale,scale);
}
function reconcileDelivery(){
  if(!deliveryContext)return;
  if(!clips.some(c=>c.id===deliveryContext.ticket.clipId&&c.lifecycle!=='deleted')){
    const wasQR=state==='qr';clearDelivery();if(wasQR)setState('idle');
  }
}
function deliveryTick(){
  if(state!=='qr'||!deliveryContext)return;
  if(deliveryContext.session!==session){clearDelivery();return;}
  reconcileDelivery();if(!deliveryContext)return;
  const left=deliveryRemaining();
  if(left<=0){setState('idle');if(mode==='demo')releaseWake();fitPicture();return;}
  $('deliverySeconds').textContent=String(left);refreshPanel();renderDeliveryVisibility();
}
function showTimedQr(context){
  context.route='qr';context.deadline=performance.now()+context.settings.qrDisplaySeconds*1000;
  setState('qr');
  $('deliveryMessage').textContent=context.demo?'\u793a\u7bc4\u7559\u8a00\uff0c\u6c92\u6709\u9304\u4f4e\u5f71\u7247\u3002':'\u5f71\u7247\u5df2\u4fdd\u5b58\u65bc\u6b64\u700f\u89bd\u5668\u3002';
  $('deliveryRef').textContent=context.ticket.label;
  $('deliveryQrLabel').textContent=context.ticket.online?'PRIVATE VIDEO / KEEP THIS LINK':'TEST QR / NO ONLINE VIDEO';
  $('deliveryQrHelp').textContent=context.ticket.online?'Scan to view later. Upload may still be pending. This private link can hide or delete the recording.':'Local test only. No online video for this recording.';
  $('deliveryQrCanvas').setAttribute('aria-label',context.ticket.online?'Private video QR link':'Local test QR, not an online video link');
  if(context.ticket.online)$('deliveryMessage').textContent='Saved locally. Your private page is reserved; upload continues after returning to Start.';
  const reasons={screen_only:'Screen QR only.',print_disabled:'No printer route enabled.',receipt_has_no_qr:'Photo-only receipt: keep the screen QR.',receipt_artwork_failed:'Receipt preview unavailable; the saved recording is retained.',not_connected:'Printer not connected.',connected_only:'Connection alone does not confirm this ticket.',sent_unconfirmed:'Sent in simulation; paper not confirmed. No automatic reprint.',failed_before_send:'Print failed in simulation. The QR remains available.',outcome_unknown:'Simulated uncertain result. Check paper before any reprint.',timeout:'Print-result wait expired. No automatic resend.',always_screen:'Always show QR, including after simulated printing.'};
  $('deliveryReason').textContent=context.nativeAttempted?'QR ticket '+context.reason+'. Paper not electronically confirmed; scan this QR as backup.':reasons[context.reason]||'Screen QR fallback. No confirmed QR ticket.';
  deliveryTick();drawDeliveryQr();requestAnimationFrame(drawDeliveryQr);
  clearInterval(deliveryTimer);deliveryTimer=setInterval(deliveryTick,100);
}
async function demoPrintResult(ticket,scenario,deadlineMs){
  // These are observable preview branches, NOT an adapter claiming physical output.
  if(scenario==='timeout'){await wait(deadlineMs);return {...ticket,state:'timeout',simulated:true};}
  await wait(250);return {...ticket,state:scenario,simulated:true};
}
async function beginDelivery(saved,receiptError=''){
  clearDelivery();const epoch=deliveryEpoch,run=session;
  const cfg=C.safeSettings(saved.settings);
  const ticket=saved.deliverySnapshot||RetroDelivery.snapshot(saved,C.qrPayload(saved.id,saved.cloud));
  const context={ticket,session:run,settings:cfg,demo:saved.kind==='demo',receiptError,route:'checking',reason:'',simulated:false};
  deliveryContext=context;
  let result={...ticket,state:'not_connected',simulated:false};
  const requested=cfg.receiptPrintEnabled&&cfg.postRecordMode!=='screen'&&!receiptError;
  const scenario=simulations.failPrint?'failed_before_send':sessionDeliveryScenario;
  if(requested&&!context.demo&&ticket.online&&ticket.containsQR&&printerClient?.available){
    context.nativeAttempted=true;
    $('stateSubtitle').textContent='Sending QR ticket / paper output is not electronically confirmed';
    let nativeDeadline;
    try{result=await Promise.race([nativeGuestPrint(saved,ticket,cfg.printWaitSeconds*1000),new Promise(resolve=>{nativeDeadline=setTimeout(()=>resolve({...ticket,state:'timeout',simulated:false}),cfg.printWaitSeconds*1000);})])||result;}finally{clearTimeout(nativeDeadline);}
    context.nativeValidated=result.nativeValidated===true;
  }else if(requested&&context.demo&&scenario!=='not_connected'){
    context.simulated=true;
    $('stateSubtitle').textContent='PRINT FLOW SIMULATION / no Bluetooth data or paper output';
    // A bounded wait and immutable session guard: late callbacks cannot change a later guest.
    let timeout;
    try{result=await Promise.race([demoPrintResult(ticket,scenario,cfg.printWaitSeconds*1000+1000),new Promise(resolve=>{
      timeout=setTimeout(()=>resolve({...ticket,state:'timeout',simulated:true}),cfg.printWaitSeconds*1000);
    })]);}finally{clearTimeout(timeout);}
  }
  if(epoch!==deliveryEpoch||run!==session||state!=='receipt')return;
  if(!clips.some(c=>c.id===ticket.clipId&&c.lifecycle!=='deleted')){clearDelivery();showError('Saved session became unavailable during hand-off.');return;}
  const decision=RetroDelivery.decision(cfg,ticket,result,{demo:context.demo,simulationEnabled:context.simulated,receiptError,nativeValidated:context.nativeValidated===true});
  context.reason=decision.reason;context.route=decision.route;
  log('delivery_decision',{route:context.route,reason:context.reason,simulated:context.simulated});
  if(decision.route==='bypass'){
    deliveryThanks=context.nativeValidated?'QR sent to printer; paper not confirmed. Fast return accepted by operator.':'SIMULATED QR PRINT / NO PAPER PRINTED. Returning to Start.';
    setState('thankyou');thankTime=performance.now();checkThankyou();
  }else showTimedQr(context);
}
function syncDeliveryForm(){
  $('postRecordMode').value=settings.postRecordMode;$('qrDisplaySeconds').value=settings.qrDisplaySeconds;
  $('printWaitSeconds').value=settings.printWaitSeconds;$('receiptPrintEnabled').checked=settings.receiptPrintEnabled;
  $('deliverySaveStatus').textContent='Saved QR window: '+settings.qrDisplaySeconds+' seconds. Physical QR requires the Android bridge and explicit pairing. Cloud links require a verified reservation.';
}
async function saveDeliverySettings(patch){
  const next=C.safeSettings({...settings,...patch});await commitSettings(next);syncDeliveryForm();
}
function setupDelivery(){
  $('deliveryForm').onsubmit=async e=>{
    e.preventDefault();try{await saveDeliverySettings({postRecordMode:$('postRecordMode').value,qrDisplaySeconds:$('qrDisplaySeconds').value,
      printWaitSeconds:$('printWaitSeconds').value,receiptPrintEnabled:$('receiptPrintEnabled').checked});
      $('deliverySaveStatus').textContent=store.available?'QR settings saved in this browser.':'Preview settings in memory only; reload resets them.';
    }catch(e){$('deliverySaveStatus').textContent='Not saved: '+e.message;}
  };
  $('deliveryReturn').onclick=()=>go('booth');
  document.addEventListener('visibilitychange',()=>{renderDeliveryVisibility();deliveryTick();if(!document.hidden)drawDeliveryQr();});
  window.addEventListener('resize',()=>{deliveryTick();requestAnimationFrame(drawDeliveryQr);});
  const leave=()=>{if(state==='receipt'){clearDelivery();setState('thankyou');setState('idle');}else if(['qr','thankyou'].includes(state))setState('idle');else clearDelivery();};
  window.addEventListener('pagehide',leave);
  window.addEventListener('retro-native-pause',()=>{if(['receipt','qr','thankyou'].includes(state))leave();});
}
