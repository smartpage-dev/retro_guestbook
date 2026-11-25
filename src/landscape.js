/* Scoped inside the controller: visual changes do not own capture or privacy ledgers. */
function refreshPanel(){
  const total=(sessionSettings&&state!=='idle'?sessionSettings.duration:settings.duration)*1000;
  const remaining=state==='recording'?Math.max(0,Math.ceil((total-elapsed)/1000))*1000:total;
  $('panelTimer').textContent=['saving','receipt','qr','thankyou'].includes(state)?'00:00':C.timeLabel(remaining);
  $('panelTimeCaption').textContent=state==='recording'?'TIME LEFT':'MESSAGE LENGTH';
  $('panelProgress').style.width=(state==='recording'?Math.min(100,elapsed/total*100):['saving','receipt','qr','thankyou'].includes(state)?100:0)+'%';
  const p={idle:['START','\u958b\u59cb\u9304\u5f71','\u64b3\u4e00\u6b21\u5c31\u5f97'],greeting:['READY','\u6e96\u5099\u958b\u59cb','\u671b\u4f4f\u93e1\u982d'],countdown:['READY','\u6e96\u5099\u958b\u59cb','\u5012\u6578\u5f8c\u81ea\u52d5\u9304\u5f71'],recording:['REC','\u9304\u5f71\u4e2d','\u6642\u9593\u5230\u81ea\u52d5\u5b8c\u6210'],saving:['SAVE','\u4fdd\u5b58\u4e2d','\u4fdd\u5b58\u4f60\u5605\u795d\u798f'],receipt:['SAVED','\u7559\u8a00\u5df2\u4fdd\u5b58','\u6536\u64da\u9810\u89bd\u6e96\u5099\u4e2d'],qr:['QR','\u6383\u78bc\u5340\u9810\u89bd','\u5012\u6578\u5f8c\u81ea\u52d5\u8fd4\u56de'],thankyou:['THANKS','\u591a\u8b1d\u4f60','\u5373\u5c07\u8fd4\u56de\u958b\u59cb'],error:['WAIT','\u8acb\u7a0d\u5019','\u8acb\u627e\u5de5\u4f5c\u4eba\u54e1']}[state];
  $('panelStartLabel').textContent=p[0];$('panelStartSub').textContent=p[1];$('panelHint').textContent=p[2];
  $('touchBtn').setAttribute('aria-label',state==='idle'?'Start recording / \u958b\u59cb\u9304\u5f71':p[1]);
  if(settings.trigger==='handset'&&state==='idle'){$('panelStartLabel').textContent='LIFT';$('panelStartSub').textContent='\u62ce\u8d77\u807d\u7b52';$('panelHint').textContent='\u807d\u7b52\u555f\u52d5\u6a21\u5f0f';}
  document.querySelectorAll('[data-lamp]').forEach(e=>e.classList.toggle('lit',e.dataset.lamp==='idle'?state==='idle':e.dataset.lamp==='recording'?state==='recording':['saving','receipt','qr','thankyou'].includes(state)));
  $('panelBoundary').textContent=mode==='real'?(cloudClient?.connection?'CAMERA ON / CLOUD ENABLED':'CAMERA ON / LOCAL ONLY'):mode==='preview'?'CAMERA LIVE / MIC OFF / PREVIEW ONLY':microphoneReady()?'MIC ON / CAMERA OFF / NO RECORDING':'DEMO / CAMERA OFF';
  if(state==='idle'&&!(offHook&&settings.trigger!=='touch')){
    document.querySelector('[data-i18n=idle]').textContent=settings.trigger==='handset'?'\u62ce\u8d77\u807d\u7b52\uff0c\u7559\u4f4e\u795d\u798f':'\u64b3\u53f3\u908a START\uff0c\u7559\u4f4e\u795d\u798f';
    document.querySelector('[data-i18n=idleHint]').textContent=settings.duration+' \u79d2\u9304\u5f71 \u00b7 \u81ea\u52d5\u5b8c\u6210 \u00b7 \u4e00\u5f35\u56de\u61b6\u5e36\u8d70';
  }
  if(state==='saving')$('stateSubtitle').textContent='\u6b63\u5728\u4fdd\u5b58\u81f3\u6b64\u700f\u89bd\u5668\uff0c\u8acb\u52ff\u95dc\u9589\u756b\u9762\u3002';
  if(state==='receipt')$('stateSubtitle').textContent=printerClient?.available&&mode==='real'?'QR ticket hand-off / video saved locally':simulations.failPrint?'Receipt fault simulation; recording is saved.':'Receipt preview ready / no native printer in this browser';
  if(state==='qr'){$('panelTimer').textContent=C.timeLabel(deliveryRemaining()*1000);$('panelTimeCaption').textContent='QR TIME LEFT';}
  if(state==='thankyou')$('stateTitle').textContent='\u591a\u8b1d\u4f60\u5605\u795d\u798f\uff01';
  const info=$('viewportInfo');if(info)info.textContent=innerWidth+' x '+innerHeight+' CSS px / picture '+$('cameraCanvas').width+' x '+$('cameraCanvas').height+' / '+renderer.mode;
}
function fitPicture(){
  if(currentView!=='booth'||state!=='idle'||mode==='real'&&cameraBusy)return;
  const rect=$('screen').getBoundingClientRect();if(rect.width<2||rect.height<2)return;
  // Freeze dimensions while capturing. Idle resize updates both preview and capture,
  // not a CSS stretch. For mid-recording rotation, contain preserves framing.
  renderer.compact=rect.height<520;renderer.setAspect(rect.width/rect.height);
  refreshPanel();
}
function setupLandscape(){
  const viewport=()=>{document.documentElement.style.setProperty('--viewport-height',innerHeight+'px');requestAnimationFrame(fitPicture);if(currentView==='admin'){refreshPanel();refreshDiagnostics();}};
  viewport();window.addEventListener('resize',viewport);
  if(window.ResizeObserver){const observer=new ResizeObserver(()=>requestAnimationFrame(fitPicture));observer.observe($('screen'));}
  $('cameraSetupBtn').onclick=()=>enableCamera();
  $('fullscreenBtn').onclick=async()=>{
    if(state!=='idle')return;
    try{if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen)throw new Error('This browser does not provide full screen.');await document.documentElement.requestFullscreen();}go('booth');await wake();}
    catch(e){toast('Full screen unavailable: '+e.message);log('fullscreen_unavailable',{error:e.message});}
  };
  document.addEventListener('fullscreenchange',viewport);
}
