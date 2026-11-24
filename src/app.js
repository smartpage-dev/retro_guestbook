/* Local-first controller. Cloud opt-in; native QR transport requires explicit Android setup. */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id), C = RetroCore;
  const zh = {
    intro:'\u62ce\u8d77\u807d\u7b52\uff0c\u7559\u4f4e\u795d\u798f\u3002\u4e00\u6bb5\u8072\u97f3\uff0c\u4e00\u5f35\u53ef\u4ee5\u5e36\u8d70\u5605\u56de\u61b6\u3002',
    idle:'\u62ce\u8d77\u807d\u7b52\u3000\u7559\u4f4e\u795d\u798f', idleHint:'\u6216\u8f15\u89f8\u958b\u59cb / LEAVE A LITTLE LOVE',
    pickup:'\u62ce\u8d77\u807d\u7b52', hangup:'\u653e\u8fd4\u807d\u7b52', touchStart:'\u8f15\u89f8\u958b\u59cb',finish:'\u5b8c\u6210\u7559\u8a00',
    recordHint:'\u653e\u8fd4\u807d\u7b52\u5c31\u53ef\u4ee5\u5b8c\u6210',
    privacy:'\u6e2c\u8a66\u7248\uff1a\u771f\u5be6\u5f71\u7247\u53ea\u5b58\u65bc\u6b64\u700f\u89bd\u5668\uff0c\u672a\u4e0a\u50b3\u96f2\u7aef\u3002',
    empty:'\u4ef2\u672a\u6709\u7559\u8a00\u3002\u8fd4\u53bb Booth \u8a66\u9304\u7b2c\u4e00\u6bb5\u3002',
    greeting:'\u6e96\u5099\u597d\u672a\uff1f', greetingSub:'\u5411\u4f4f\u93e1\u982d\uff0c\u7559\u4f4e\u4f60\u5605\u795d\u798f\u3002',
    countdown:'\u6e96\u5099\u958b\u59cb', saving:'\u4fdd\u5b58\u7dca\u56de\u61b6', saved:'\u6536\u5230\u4f60\u5605\u795d\u798f\uff01',
    hold:'\u8acb\u653e\u8fd4\u597d\u807d\u7b52', thanks:'\u591a\u8b1d\u4f60\uff01', attention:'\u8acb\u6435\u5de5\u4f5c\u4eba\u54e1',
    demo:'\u793a\u7bc4\u4e2d\uff0c\u6c92\u6709\u9304\u4f4e\u8072\u97f3',actual:'\u6b63\u5728\u9304\u5f71\u53ca\u6536\u97f3'
  };
  document.querySelectorAll('[data-i18n]').forEach(e => e.textContent=zh[e.dataset.i18n]);
  const surfaceRole=location.hash.startsWith('#guest/')?'guest':location.hash==='#show'?'show':'booth';
  const store=new BrowserStore(); await store.open();
  let nextSequence=1,clips=[], settings=C.safeSettings({grain:.04});
  if(store.available) {
    try {const saved=await store.getSettings();if(saved?.value) settings=C.safeSettings(saved.value); clips=(await store.list()).filter(c=>c.lifecycle!=='deleted');nextSequence=Math.max(clips.reduce((n,c)=>Math.max(n,c.seq+1),1),typeof store.getSequence==='function'?(await store.getSequence())?.next||1:1);}
    catch(e){toast('Stored data could not be loaded: '+e.message);}
  }
  let state='idle', mode='demo', offHook=false, session=0, stream=null, recorder=null, recordStream=null;
  let audioContext=null, analyser=null, audioNode=null, elapsed=0, started=0, interval=null;
  let pending=null, recordParts=[], stopPromise=null, sessionSettings=null, sessionId='', snapshots=[], snapIndex=0;
  let selectedClip=null, lastReceipt=null, playbackURL=null, currentView='booth', wakeLock=null, cameraBusy=false;
  let settingsSaving=false;
  let thankTime=0, stopInFlight=false, tabAllowed=true, ready=false;
  const diagnosticRing=new RetroDiagnostics.Ring(500);
  const diagStorageKey='retrobooth_app_diagnostics_v1';
  try{const previous=JSON.parse(localStorage.getItem(diagStorageKey)||'[]');if(Array.isArray(previous))for(const event of previous.slice(-250))if(event&&typeof event.name==='string')diagnosticRing.add(event.name,event.detail||{});}catch{}
  let lastMediaFailure=null;
  const simulations={offline:false,failPrint:false,failSave:false};
  const labels={idle:'STANDBY',greeting:'GREETING',countdown:'GET READY',recording:'RECORDING',saving:'SAVING',receipt:'DELIVERY CHECK',qr:'YOUR QR',thankyou:'THANK YOU',error:'NEEDS ATTENTION'};
  const renderer=new RetroRenderer($('cameraCanvas'),$('inputVideo'),settings);
  renderer.draw(0);
  const sample={id:C.randomId(),seq:0,durationMs:10000,kind:'demo'};
  lastReceipt={clip:sample,source:renderer.snapshot(),settings:{...settings}};
  try{await Receipt.prepare(settings);}catch(e){settings.logoData='';log('startup_logo_rejected',{error:e.message});}
  Receipt.render($('receiptCanvas'),sample,lastReceipt.source,settings);

  function log(name,detail={}) {diagnosticRing.add(name,detail);try{localStorage.setItem(diagStorageKey,JSON.stringify(diagnosticRing.snapshot().slice(-250)));}catch{}if(currentView==='admin')updateDiagnosticPreview();}
  function updateDiagnosticPreview(){const node=$('diagnosticRecent');if(!node)return;const entries=diagnosticRing.snapshot().slice(-12);node.textContent=entries.map(e=>e.at.slice(11,19)+' '+e.name+' '+JSON.stringify(e.detail)).join('\n')||'No events recorded yet.';}
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5500);}
  function download(blob,name){if(window.RetroNative?.postMessage){exportToAndroid(blob,name).catch(e=>toast('Export failed: '+e.message));return;}const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
  function textDownload(data,name){download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name);}
  function busy(){return state!=='idle';}
  function go(view){
    if(!['booth','library','admin','guest','show'].includes(view))return;
    if(printerActionBusy){toast('Finish the printer operation first.');return;}
    if(busy() && view!=='booth'){toast('Finish or recover the current session first.');return;}
    if(document.body.classList.contains('kiosk') && view!=='booth')exitKiosk();
    if(currentView==='show'&&view!=='show')clearShow();
    if(currentView==='guest'&&view!=='guest')clearGuestMedia();
    currentView=view;renderer.active=['booth','admin'].includes(view);renderer.effectsOverride=null;
    document.body.classList.toggle('kiosk',view==='booth');
    document.body.classList.toggle('show-surface',view==='show');
    document.body.classList.toggle('guest-surface',view==='guest');
    document.querySelectorAll('.view').forEach(el=>{const active=el.id==='view-'+view;el.hidden=!active;el.classList.toggle('active',active);});
    document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
    if(view==='library')renderLibrary();if(view==='admin'){syncForm();refreshDiagnostics();previewDesign();renderCloud();refreshPrinterClips();refreshPrinter();}
    if(view==='show')reconcileShow();
    window.scrollTo(0,0);if(view==='booth')requestAnimationFrame(fitPicture);
  }
  function setState(next){const old=state;state=C.transition(state,next);if(['idle','error'].includes(state))clearDelivery();log('state',{from:old,to:state});renderState();}
  function renderState(){
    applyScreenAppearance();
    $('screenState').textContent=labels[state];document.body.dataset.captureState=state;
    $('idleOverlay').hidden=state!=='idle';$('recordOverlay').hidden=state!=='recording';
    $('stateOverlay').hidden=['idle','recording','qr'].includes(state);
    $('stateTitle').classList.toggle('countdown',state==='countdown');
    $('stateKicker').textContent=labels[state];
    const messages={greeting:[zh.greeting,zh.greetingSub],countdown:['3',zh.countdown],saving:[zh.saving,'Writing to local browser storage. Do not close this page.'],
      receipt:[zh.saved,simulations.failPrint?'Receipt unavailable (simulated). Video remains local.':'Preparing the saved recording QR hand-off.'],
      thankyou:[zh.thanks,offHook?zh.hold:'Your moment stays here. Returning to standby.'],error:[zh.attention,'Recording is blocked until the operator resolves this.']};
    if(messages[state]){ $('stateTitle').textContent=messages[state][0];$('stateSubtitle').textContent=messages[state][1]; }
    $('handsetBtn').querySelector('span').textContent=offHook?zh.hangup:zh.pickup;
    $('handsetBtn').disabled=(settings.trigger==='touch' && !offHook)||state==='error';
    $('touchBtn').hidden=false;$('touchBtn').disabled=state!=='idle'||settings.trigger==='handset'||cameraBusy||settingsSaving||printerActionBusy||cloudClaimBusy||!tabAllowed;
    $('stopBtn').hidden=true;
    $('touchBtn').hidden=false;
    $('touchBtn').className='panel-start';
    if(offHook&&settings.trigger==='both')$('touchBtn').disabled=true;
    $('cameraBtn').disabled=state!=='idle'||cameraBusy;
    document.querySelector('[data-i18n="idle"]').textContent=settings.trigger==='touch'?'\u8f15\u89f8\u958b\u59cb\u3000\u7559\u4f4e\u795d\u798f':zh.idle;
    document.querySelector('[data-i18n="recordHint"]').textContent='\u8acb\u7559\u4f4e\u795d\u798f\uff0c\u6642\u9593\u5230\u6703\u81ea\u52d5\u5b8c\u6210';
    document.querySelector('[data-i18n="idleHint"]').textContent=settings.duration+' \u79d2\u9304\u5f71 \u00b7 \u81ea\u52d5\u5b8c\u6210 \u00b7 \u8acb\u53d6\u8d70\u7d00\u5ff5\u55ae';
    if(state==='idle'&&offHook&&settings.trigger!=='touch'){document.querySelector('[data-i18n="idle"]').textContent=zh.hold;document.querySelector('[data-i18n="idleHint"]').textContent='Replace the handset, then lift again for the next message.';}
    $('screenEvent').textContent=settings.title;$('durationTag').textContent=settings.duration+' SEC';
    $('modeTag').textContent=mode==='real'?'CAMERA + MIC ON':'DEMO SIGNAL';$('signalLabel').textContent=mode==='real'?'CAMERA':'DEMO';
    $('globalNotice').textContent=mode==='real'?(cloudClient?.connection?'Camera + microphone enabled. Local-first cloud delivery is configured. Physical printing is disconnected.':'Camera + microphone enabled. Local-only; no new cloud upload configured.'):'Demo mode. Camera is off. Printing and cloud are not connected.';
    $('cameraCanvas').classList.toggle('mirrored',mode==='real'&&settings.mirror);
    $('cameraBtn').textContent=mode==='real'?'Turn off camera + microphone':'Enable camera + microphone';$('cameraSetupBtn').textContent=$('cameraBtn').textContent;$('cameraSetupBtn').disabled=state!=='idle'||cameraBusy;
    const step=['greeting','countdown'].includes(state)?'greeting':['saving','receipt','qr','thankyou'].includes(state)?'saving':state;
    document.querySelectorAll('[data-step]').forEach(e=>e.classList.toggle('active',e.dataset.step===step));
    $('countBadge').textContent=clips.length;
    $('storageTag').textContent=store.available?'BROWSER STORAGE / '+clips.length+' LOCAL SESSION'+(clips.length===1?'':'S'):'MEMORY ONLY / EXPORT BEFORE CLOSING';
    refreshPanel();renderDeliveryVisibility();
    $('queueSummary').textContent=clips.filter(x=>x.simulation).map(x=>'#'+String(x.seq).padStart(3,'0')+' / upload: '+x.simulation.upload+' / receipt: '+x.simulation.print).join('\n')||'No simulated jobs yet.';
  }
  async function ensureAudio(){
    try {const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
      if(!audioContext) audioContext=new AudioCtx(); if(audioContext.state==='suspended')await audioContext.resume();
    }catch(e){log('audio_context',{error:e.message});}
  }
  function tone(){
    if(!audioContext||audioContext.state!=='running')return;
    const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=720;
    g.gain.setValueAtTime(0,audioContext.currentTime);g.gain.linearRampToValueAtTime(.08,audioContext.currentTime+.015);
    g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.connect(g);g.connect(audioContext.destination);
    o.start();o.stop(audioContext.currentTime+.2);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  async function wake(){try{if('wakeLock'in navigator && document.visibilityState==='visible')wakeLock=await navigator.wakeLock.request('screen');}catch(e){log('wake_lock',{error:e.message});}}
  function releaseWake(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null;}}
  function cameraErrorMessage(e){
    const explanations={NotAllowedError:'Permission denied. Allow camera AND microphone for this app in Android Settings, then retry.',
      NotFoundError:'No usable camera or microphone was found. Check the device list and USB connection.',
      NotReadableError:'Device is busy or unavailable. Close other camera/video-call apps, then use Test camera only and Test microphone only below.',
      AbortError:'Android stopped the media device. Retry after closing other camera apps.',
      OverconstrainedError:'The selected device cannot satisfy the request. Refresh devices or choose System default.'};
    return explanations[e?.name]||String(e?.message||e);
  }
  function mediaStatus(message){const node=$('mediaDeviceStatus');if(node)node.textContent=message;}
  function mediaConstraints(){
    const videoId=$('cameraSelect').value,audioId=$('micSelect').value,direction=$('cameraDirection').value;
    const video={width:{ideal:1280},height:{ideal:720}};
    if(videoId)video.deviceId={exact:videoId};
    else if(direction!=='auto')video.facingMode={ideal:direction};
    const audio={echoCancellation:true,noiseSuppression:true,autoGainControl:true};
    if(audioId)audio.deviceId={exact:audioId};
    return {video,audio};
  }
  async function probeInput(kind){
    if(state!=='idle'||cameraBusy||settingsSaving)return;
    if(mode==='real'){mediaStatus('Stop the active camera before testing an input separately.');return;}
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){mediaStatus('Camera tests require HTTPS or a trusted app origin.');return;}
    cameraBusy=true;renderState();
    let candidate=null;const probeStarted=performance.now();
    try{
      const c=mediaConstraints();
      log('media_probe_start',{kind,explicitCamera:!!$('cameraSelect').value,explicitMic:!!$('micSelect').value,direction:$('cameraDirection').value});
      const request=kind==='video'?{video:c.video,audio:false}:{video:false,audio:c.audio};
      mediaStatus('Testing '+(kind==='video'?'camera':'microphone')+' only… Android may ask for permission.');
      candidate=await navigator.mediaDevices.getUserMedia(request);
      const track=kind==='video'?candidate.getVideoTracks()[0]:candidate.getAudioTracks()[0];
      if(!track||track.readyState!=='live')throw new Error('No active '+kind+' track returned.');
      const details=track.getSettings?.()||{};
      mediaStatus((kind==='video'?'Camera':'Microphone')+' test PASSED ('+String(track.label||'unnamed device').slice(0,72)+')'+(details.width?' / '+details.width+'x'+details.height:'')+'. Track released; now test the other input.');
      log('media_probe_pass',{kind,elapsedMs:Math.round(performance.now()-probeStarted),trackState:track.readyState,width:details.width||null,height:details.height||null,frameRate:details.frameRate||null});
    }catch(e){mediaStatus((kind==='video'?'Camera':'Microphone')+' test FAILED: '+cameraErrorMessage(e));lastMediaFailure={stage:'probe_'+kind,name:e.name||'Error',message:cameraErrorMessage(e)};log('media_probe_failure',{kind,elapsedMs:Math.round(performance.now()-probeStarted),error:e.name||'Error',detail:e.message||''});}
    finally{if(candidate)candidate.getTracks().forEach(t=>t.stop());cameraBusy=false;await refreshDevices();renderState();refreshDiagnostics();}
  }
  async function enableCamera(force=false){
    if(state!=='idle'||cameraBusy||settingsSaving)return;
    if(mode==='real'&&!force){disableCamera();mediaStatus('Camera and microphone stopped.');return;}
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){toast('Camera testing needs HTTPS or localhost in a full browser. Demo mode still works.');return;}
    if(!window.MediaRecorder||!$('cameraCanvas').captureStream){toast('Canvas recording is unavailable here. Use demo mode; this device has not passed capture validation.');return;}
    cameraBusy=true;renderState();
    let candidate=null;let cameraStage='request_media';const cameraStarted=performance.now();
    log('camera_enable_start',{explicitCamera:!!$('cameraSelect').value,explicitMic:!!$('micSelect').value,direction:$('cameraDirection').value,secureContext:window.isSecureContext});
    try{
      disableCamera(false);
      const requested=mediaConstraints();
      mediaStatus('Opening selected camera + microphone…');
      try{candidate=await navigator.mediaDevices.getUserMedia(requested);}
      catch(firstError){
        // Some Android WebViews reject ideal resolution/processing constraints. Retry ONCE
        // only for default devices; never silently replace an explicitly selected input.
        const auto=$('cameraSelect').value===''&&$('micSelect').value==='';
        if(!auto||!['NotReadableError','AbortError','OverconstrainedError'].includes(firstError.name))throw firstError;
        await new Promise(resolve=>setTimeout(resolve,300));
        mediaStatus('First request failed; trying Android basic camera + microphone constraints once…');
        log('camera_first_request_failed',{stage:'request_media',name:firstError.name||'Error',message:firstError.message||'',elapsedMs:Math.round(performance.now()-cameraStarted)});
        log('camera_relaxed_retry',{reason:firstError.name});
        const direction=$('cameraDirection').value;
        candidate=await navigator.mediaDevices.getUserMedia({video:direction==='auto'?true:{facingMode:{ideal:direction}},audio:true});
      }
      if(candidate.getVideoTracks().length!==1||!candidate.getAudioTracks().length)throw new Error('Both camera and microphone are required. No silent fallback.');
      cameraStage='video_play';log('camera_tracks_received',{videoTracks:candidate.getVideoTracks().length,audioTracks:candidate.getAudioTracks().length,elapsedMs:Math.round(performance.now()-cameraStarted)});
      stream=candidate;candidate=null;$('inputVideo').srcObject=stream;await $('inputVideo').play();
      cameraStage='audio_context';await ensureAudio();
      if(audioContext){analyser=audioContext.createAnalyser();analyser.fftSize=2048;audioNode=audioContext.createMediaStreamSource(stream);audioNode.connect(analyser);}
      stream.getTracks().forEach(t=>{
        t.addEventListener('ended',()=>{log('track_ended',{kind:t.kind});if(state==='recording')stopRecording(true,'Camera or microphone disconnected.');else if(['greeting','countdown'].includes(state)){session++;setState('idle');disableCamera();toast('Camera or microphone disconnected.');}else if(state==='idle'){disableCamera();toast('Device disconnected. Returned to demo mode.');}});
      });
      cameraStage='refresh_devices';mode='real';renderer.live=true;await wake();await refreshDevices();
      const video=stream.getVideoTracks()[0],audio=stream.getAudioTracks()[0];
      mediaStatus('LIVE: '+String(video.label||'camera').slice(0,72)+' + '+String(audio.label||'microphone').slice(0,72)+'. Ready for a test recording.');
      toast('Camera and microphone are ON. Test with a disposable recording.');
      lastMediaFailure=null;log('camera_enabled',{elapsedMs:Math.round(performance.now()-cameraStarted),videoWidth:video.getSettings().width||null,videoHeight:video.getSettings().height||null,videoFrameRate:video.getSettings().frameRate||null,audioLive:audio.readyState==='live'});
    }catch(e){if(candidate)candidate.getTracks().forEach(t=>t.stop());disableCamera(false);mediaStatus('Camera + microphone FAILED: '+cameraErrorMessage(e));toast('Camera not enabled: '+cameraErrorMessage(e));lastMediaFailure={stage:cameraStage,name:e.name||'Error',message:cameraErrorMessage(e)};log('camera_failure',{stage:cameraStage,elapsedMs:Math.round(performance.now()-cameraStarted),name:e.name||'Error',error:String(e.message||e)});}
    finally{cameraBusy=false;renderState();refreshDiagnostics();}
  }
  function disableCamera(render=true){
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
    if(audioNode){audioNode.disconnect();audioNode=null;}analyser=null;
    $('inputVideo').srcObject=null;renderer.live=false;mode='demo';releaseWake();
    if(render)renderState();
  }
  async function refreshDevices(){
    if(!navigator.mediaDevices?.enumerateDevices)return;
    try {const devices=await navigator.mediaDevices.enumerateDevices();
      [['cameraSelect','videoinput'],['micSelect','audioinput']].forEach(([id,kind])=>{
        const e=$(id),selected=e.value;e.replaceChildren(new Option('System default',''));
        devices.filter(d=>d.kind===kind).forEach((d,i)=>{if(d.deviceId)e.append(new Option(d.label||kind+' '+(i+1),d.deviceId));});
        if(Array.from(e.options).some(o=>o.value===selected))e.value=selected;
      });
      const videoCount=devices.filter(d=>d.kind==='videoinput').length,audioCount=devices.filter(d=>d.kind==='audioinput').length;
      log('media_devices',{cameras:videoCount,microphones:audioCount,labelsVisible:devices.some(d=>!!d.label)});
      if(!videoCount||!audioCount)mediaStatus('Detected '+videoCount+' camera(s), '+audioCount+' microphone(s). Missing devices may require Android permissions.');
    }catch(e){mediaStatus('Device list unavailable: '+cameraErrorMessage(e));log('media_devices_failure',{name:e.name||'Error',message:e.message||''});}
  }
  async function start(origin){
    if(surfaceRole!=='booth'||currentView!=='booth'||!ready||state!=='idle'||cameraBusy||settingsSaving||printerActionBusy||cloudClaimBusy||!tabAllowed)return;
    if(origin==='touch'&&settings.trigger==='handset')return;
    if(origin==='handset'&&settings.trigger==='touch')return;
    fitPicture();
    if(!renderer.running){showError('Graphics renderer stopped. Reload after exporting any saved clips.');return;}
    if(mode==='real'&&!store.available){showError('Browser storage is unavailable. Real capture is blocked to avoid losing guest recordings.');return;}
    if(mode==='real'&&(!stream||stream.getTracks().some(t=>t.readyState!=='live'))){disableCamera();toast('Reconnect camera and microphone before recording.');return;}
    if(mode==='real'&&cloudClient?.connection&&!crypto.subtle){toast('Secure hashing is unavailable. Use HTTPS or localhost before enabling cloud recording.');return;}
    sessionId=C.randomId();sessionCloud=null;
    if(mode==='real'&&cloudClient?.connection){
      cloudClaimBusy=true;renderState();
      try{sessionCloud=await cloudClient.claim(sessionId);}catch(e){toast(e.message);return;}finally{cloudClaimBusy=false;renderState();}
      if(currentView!=='booth'||state!=='idle'||document.hidden)return;
    }
    session++;const run=session;sessionSettings=C.safeSettings(settings);sessionDeliveryScenario=$('deliveryScenario').value;
    pending=null;selectedClip=null;elapsed=0;snapshots=[];snapIndex=0;stopInFlight=false;
    go('booth');setState('greeting');await ensureAudio();await wake();
    // Only a cue and text greeting in this version; custom voice greetings are not implemented.
    await wait(100);if(run!==session||state!=='greeting')return;
    setState('countdown');
    for(let i=sessionSettings.countdown;i>=1;i--){$('stateTitle').textContent=String(i);await wait(1000);if(run!==session||state!=='countdown')return;}
    tone();await wait(320);if(run!==session||state!=='countdown')return;
    try{
      if(mode==='real')beginRecorder();
      started=performance.now();setState('recording');renderer.recording=true;
      $('audioWarning').textContent=mode==='demo'?zh.demo:zh.actual;
      recordTick();interval=setInterval(recordTick,70);
    }catch(e){cleanupRecorder();showError('Recording could not start: '+e.message);}
  }
  function beginRecorder(){
    const canvasStream=$('cameraCanvas').captureStream(30);
    const audio=stream?.getAudioTracks().filter(t=>t.readyState==='live');
    if(!audio?.length){canvasStream.getTracks().forEach(t=>t.stop());throw new Error('Microphone is not available.');}
    recordStream=new MediaStream([...canvasStream.getVideoTracks(),audio[0].clone()]);
    const mime=C.chooseMime(m=>MediaRecorder.isTypeSupported(m));
    recorder=new MediaRecorder(recordStream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:2500000,audioBitsPerSecond:128000});
    recordParts=[];
    stopPromise=new Promise((resolve,reject)=>{
      recorder.ondataavailable=e=>{if(e.data?.size)recordParts.push(e.data);};
      recorder.onstop=()=>{const type=recorder?.mimeType||recordParts[0]?.type||mime;
        const blob=new Blob(recordParts,{type});blob.size?resolve(blob):reject(new Error('Recorder returned an empty file.'));};
      recorder.onerror=e=>{log('recorder_error',{error:String(e.error?.message||'unknown')});if(state==='recording')stopRecording(true,'The recorder reported an error.');};
    });
    // A timeslice limits chunk size. It is NOT a crash-recovery or durability guarantee.
    recorder.start(1000);
  }
  function recordTick(){
    if(state!=='recording')return;
    elapsed=performance.now()-started;
    $('recordTimer').textContent=C.timeLabel(elapsed)+' / '+C.timeLabel(sessionSettings.duration*1000);
    $('recordProgress').style.width=Math.min(100,elapsed/(sessionSettings.duration*10))+'%';
    const points=[.25,.5,.75];
    if(snapIndex<3 && elapsed>=sessionSettings.duration*1000*points[snapIndex]){const c=renderer.snapshot();snapshots.push({canvas:c,score:renderer.sharpness(c)});snapIndex++;}
    drawWave(elapsed);refreshPanel();
    if(mode==='real'&&stream?.getAudioTracks()[0]?.muted)$('audioWarning').textContent='Microphone temporarily muted. Check device routing.';
    if(elapsed>=sessionSettings.duration*1000)stopRecording(false);
  }
  function drawWave(ms){
    const canvas=$('waveCanvas'),c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.strokeStyle='#c0e6a4';c.lineWidth=2;c.shadowColor='#b7dd99';c.shadowBlur=7;c.beginPath();
    const samples=new Uint8Array(2048);if(analyser)analyser.getByteTimeDomainData(samples);else samples.fill(128);
    for(let x=0;x<canvas.width;x++){const value=mode==='demo'?Math.sin(x*.06+ms*.008)*Math.sin(x*.014-ms*.001)*.2:(samples[Math.floor(x/680*2048)]-128)/128;
      const y=60+value*95;x===0?c.moveTo(x,y):c.lineTo(x,y);}
    c.stroke();c.shadowBlur=0;
  }
  function cleanupRecorder(){if(recordStream){recordStream.getTracks().forEach(t=>t.stop());recordStream=null;}recorder=null;recordParts=[];renderer.recording=false;}
  async function stopRecording(interrupted=false,reason=''){
    if(state!=='recording'||stopInFlight)return;
    stopInFlight=true;clearInterval(interval);interval=null;elapsed=performance.now()-started;setState('saving');renderer.recording=false;
    let blob=null;
    try{
      if(mode==='real'){
        if(recorder&&recorder.state!=='inactive')recorder.stop();
        blob=await Promise.race([stopPromise,wait(10000).then(()=>{throw new Error('Recorder did not finish. No safe playable file can be promised.');})]);
      }
      cleanupRecorder();
      if(C.discardShort(elapsed,interrupted)){
        // Saving was never started; allow an explicit cancellation transition through receipt/thanks.
        setState('receipt');setState('thankyou');thankTime=0;setState('idle');toast('Less than 2 seconds: treated as accidental input. No clip saved.');return;
      }
      if(!snapshots.length){const c=renderer.snapshot();snapshots.push({canvas:c,score:renderer.sharpness(c)});}
      snapshots.sort((a,b)=>b.score-a.score);const best=snapshots[0].canvas;
      const seq=nextSequence++; // Never reuse a deleted display number in this session.
      let sha256=null;
      if(blob&&crypto.subtle){const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());sha256=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}
      const validation=blob?await inspectBlob(blob):{status:'demo_no_video'};
      pending={id:sessionId,seq,createdAt:new Date().toISOString(),kind:blob?'real':'demo',durationMs:Math.round(elapsed),
        cloud:blob?sessionCloud:null,mime:blob?.type||null,sizeBytes:blob?.size||0,blob,sha256,validation,interrupted,interruptionReason:reason,
        title:sessionSettings.title,eventDate:sessionSettings.date,settings:C.safeSettings(sessionSettings),captureLook:RetroEffects.resolve(sessionSettings),effectEngine:'shared-grade-v1',thumbnail:renderer.thumbnail(),
        rawSnapshot:best.toDataURL('image/jpeg',.85),uploadState:'not_configured',printState:'not_connected',
        lifecycle:'active',guestPermission:'private',moderation:'pending',showAfter:Date.now()+sessionSettings.showDelay*1000,privacyRevision:0,
        simulation:{upload:simulations.offline?'simulated_pending':'simulated_ready',print:simulations.failPrint?'simulated_pending':'simulated_complete'}};
      pending.deliverySnapshot=RetroDelivery.snapshot(pending,C.qrPayload(pending.id,pending.cloud));
      await savePending();
    }catch(e){cleanupRecorder();showError(e.message);log('stop_or_save_failure',{error:e.message,hasPending:Boolean(pending)});}
  }
  function inspectBlob(blob){return new Promise(resolve=>{
    const v=document.createElement('video'),url=URL.createObjectURL(blob);v.preload='metadata';v.muted=true;v.playsInline=true;
    let done=false;const end=value=>{if(done)return;done=true;clearTimeout(timer);v.removeAttribute('src');v.load();URL.revokeObjectURL(url);resolve(value);};
    const timer=setTimeout(()=>end({status:'metadata_unverified'}),5000);
    v.onloadedmetadata=()=>end({status:v.videoWidth>0?'metadata_readable':'metadata_unverified',width:v.videoWidth,height:v.videoHeight,durationSeconds:Number.isFinite(v.duration)?v.duration:null});
    v.onerror=()=>end({status:'decode_error'});v.src=url;
  });}
  async function savePending(){
    if(!pending)throw new Error('No finalized recording is available to retry.');
    if(simulations.failSave){simulations.failSave=false;$('failSave').checked=false;throw new Error('Simulated local write failure. The finalized clip is still in memory; retry or export before closing.');}
    if(store.available)await store.saveClip(pending);
    else if(pending.kind==='real')throw new Error('No local browser storage. Export the in-memory clip now.');
    const saved=pending;clips=clips.filter(x=>x.id!==saved.id);clips.push(saved);pending=null;
    announceChange(saved.id);
    log('local_save',{id:saved.id,bytes:saved.sizeBytes,kind:saved.kind,validation:saved.validation.status,persistent:store.available});
    let receiptError='';
    try{await displayReceipt(saved);}catch(e){receiptError=e.message;lastReceipt=null;$('receiptDownload').disabled=true;const rc=$('receiptCanvas');rc.height=160;const ctx=rc.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,rc.width,rc.height);ctx.fillStyle='#111';ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText('RECEIPT PREVIEW UNAVAILABLE',192,65);ctx.fillText('VIDEO RETAINED LOCALLY',192,100);log('receipt_preview_failed',{error:e.message});}
    if(saved.kind==='real' && (saved.interrupted||saved.validation.status!=='metadata_readable')){
      selectedClip=saved;showError('The interrupted or unverified clip was retained locally. Review and export it before the next guest. '+saved.interruptionReason);return;
    }
    setState('receipt');$('receiptStatus').textContent=receiptError?'Local session saved / receipt preview failed':simulations.failPrint?'Receipt unavailable (simulated)':'Preview generated / no physical printing';
    await beginDelivery(saved,receiptError);
  }
  function checkThankyou(){if(state!=='thankyou')return;
    $('stateSubtitle').textContent=offHook?zh.hold:(deliveryThanks||'Returning to standby.');
    if(performance.now()-thankTime>=(sessionSettings?.returnSeconds??settings.returnSeconds)*1000){setState('idle');if(mode==='demo')releaseWake();fitPicture();return;}
    setTimeout(checkThankyou,200);
  }
  function hook(lift){
    if(lift===offHook)return;
    if(settings.trigger==='touch' && !offHook)return;
    offHook=lift;log('hook',{offHook});renderState();
    if(lift){if(state==='idle')start('handset');else toast('Booth is busy. Replace the handset, then lift it again when ready.');}
    else if(['greeting','countdown'].includes(state)){session++;setState('idle');toast('Cancelled before recording. Nothing saved.');}
    else if(state==='recording')log('hangup_during_fixed_recording',{action:'timer_continues'});
    else if(state==='thankyou')checkThankyou();
  }
  async function displayReceipt(clip){
    await Receipt.prepare(clip.settings);
    const image=new Image();image.src=clip.rawSnapshot;await Promise.race([image.decode(),wait(5000).then(()=>{throw new Error('Receipt image decode timed out.');})]);
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);
    lastReceipt={clip,source:c,settings:clip.settings};$('receiptDownload').disabled=false;Receipt.render($('receiptCanvas'),clip,c,clip.settings);
    $('receiptStatus').textContent='Message #'+String(clip.seq).padStart(3,'0')+' / preview only';
    renderState();
  }
  function showError(message){
    clearInterval(interval);session++;
    if(state!=='error')setState('error');
    $('errorText').textContent=message;
    $('recoveryText').textContent=pending?'A finalized session is in memory, not yet committed to local storage. Do not reload or close this tab.':'No automatic recovery guarantee. Check the local library and exported files. Interrupted chunks may not be playable.';
    $('retrySave').hidden=!pending;
    $('recoveryDownload').hidden=!(pending?.blob||selectedClip?.blob);
    if(!$('errorDialog').open)$('errorDialog').showModal();
  }
  function syncForm(){
    syncDeliveryForm();
    syncAppearanceForm();syncEffects();
    $('eventTitle').value=settings.title;$('eventDate').value=settings.date;$('duration').value=settings.duration;$('preset').value=settings.preset;
    $('grain').value=Math.round(settings.grain*100);$('grainValue').textContent=Math.round(settings.grain*100)+'%';
    $('countdownSetting').value=settings.countdown;$('returnSeconds').value=settings.returnSeconds;
    $('receiptStyle').value=settings.receiptStyle;$('receiptCaption').value=settings.receiptCaption;$('receiptFooter').value=settings.receiptFooter;draftLogo=settings.logoData;
    $('showEnabled').checked=settings.showEnabled;$('showDelay').value=settings.showDelay;
    $('mirror').checked=settings.mirror;$('osd').checked=settings.osd;$('trigger').value=settings.trigger;$('receiptMode').value=settings.receipt;
  }
  async function refreshDiagnostics(){
    let usage='Not available',persistent='Not requested';
    try{if(navigator.storage?.estimate){const e=await navigator.storage.estimate();usage=((e.usage||0)/1048576).toFixed(1)+' MB / browser quota '+((e.quota||0)/1073741824).toFixed(1)+' GB';}
      if(navigator.storage?.persisted)persistent=(await navigator.storage.persisted())?'Granted (still not a backup)':'Best effort / not granted';}catch{}
    const rows=[['Display profile','32-inch landscape / Android target unverified'],['Screen style',styleName(settings.screenStyle)],['Viewport',innerWidth+' x '+innerHeight+' CSS px'],['Capture canvas',$('cameraCanvas').width+' x '+$('cameraCanvas').height],['Capture mode',mode==='real'?'CAMERA + MIC ON':'DEMO / CAMERA OFF'],['Renderer',renderer.mode],['Camera look',RetroEffects.resolve(settings).name],['Render rate',renderer.fps.toFixed(1)+' fps (not encoded fps)'],['GPU fallback warning',renderer.backendWarning||'None'],['Browser storage',store.available?'IndexedDB available':'Unavailable / demo only'],['Storage estimate',usage],['Persistence',persistent],['Canvas MediaRecorder',!!window.MediaRecorder&&!!$('cameraCanvas').captureStream?'API present / device test required':'Unavailable'],['Secure context',window.isSecureContext?'Yes':'No'],['Wake lock',wakeLock&&!wakeLock.released?'Acquired':'Not held'],['Single-tab lock',!tabAllowed?'Another booth tab active':navigator.locks?'Exclusive lock acquired':'Unavailable: use one tab only'],['Handset',offHook?'Lifted (keyboard/UI signal)':'On hook (keyboard/UI signal)'],['Printer',printerText()],['Cloud',cloudClient?.connection?'Configured / '+cloudClient.poolCount+' reserved links':'Local-only / no new cloud uploads']];
    $('diagnostics').replaceChildren(...rows.map(([name,value])=>{const div=document.createElement('div');div.className='diag-row';const a=document.createElement('span'),b=document.createElement('span');a.textContent=name;b.textContent=value;div.append(a,b);return div;}));
  }
  function renderLibrary(){
    $('realCount').textContent=clips.filter(x=>x.kind==='real').length;$('demoCount').textContent=clips.filter(x=>x.kind==='demo').length;
    $('localBytes').textContent=(clips.reduce((n,x)=>n+x.sizeBytes,0)/1048576).toFixed(1)+' MB';
    $('emptyLibrary').hidden=clips.length>0;$('libraryGrid').replaceChildren();
    [...clips].sort((a,b)=>b.seq-a.seq).forEach(clip=>{
      const card=document.createElement('article');card.className='clip-card';
      const img=document.createElement('img');img.src=clip.thumbnail;img.alt='Recorded moment '+clip.seq;img.loading='lazy';
      const info=document.createElement('div');info.className='card-info';const badge=document.createElement('span');badge.className='pill'+(clip.kind==='real'?' green-pill':'');badge.textContent=clip.kind==='real'?'REAL / BROWSER LOCAL':'DEMO / NO VIDEO';
      const title=document.createElement('h3');title.textContent='Message No. '+String(clip.seq).padStart(3,'0');
      const detail=document.createElement('p');detail.textContent=clip.title+' / '+C.timeLabel(clip.durationMs)+' / '+new Date(clip.createdAt).toLocaleString();
      const status=document.createElement('p');status.textContent=(clip.interrupted?'Interrupted / review required. ':'')+(clip.cloud?'Cloud: '+clip.cloud.status+'. ':'Cloud: not configured. ')+'Printer: '+(clip.printTicket?.state||'not connected')+'.';
      const actions=document.createElement('div');actions.className='button-row';
      const view=document.createElement('button');view.className='btn secondary';view.textContent=clip.kind==='real'?'Play / export':'View demo';view.addEventListener('click',()=>openClip(clip));
      const manage=document.createElement('button');manage.className='btn secondary';manage.textContent='Guest page preview';manage.onclick=()=>openGuest(clip.id);
      const approve=document.createElement('button');approve.className='btn secondary';approve.textContent=clip.moderation==='approved'?'Revoke show approval':'Approve for show';
      approve.disabled=!!clip.cloud;if(clip.cloud)approve.textContent='Use Cloud Admin for approval';
      approve.onclick=async()=>{try{await changeClip(clip.id,c=>({...c,moderation:c.moderation==='approved'?'pending':'approved'}));renderLibrary();}catch(e){toast(e.message);}};
      const visibility=document.createElement('p');visibility.className='privacy-meta';visibility.textContent='Guest: '+(clip.guestPermission||'private')+' / Admin: '+(clip.moderation||'pending');info.append(visibility);
      const del=document.createElement('button');del.className='btn secondary';del.textContent='Delete';del.onclick=()=>requestDelete(clip.id,'admin');
      actions.append(view,manage,approve,del);info.append(badge,title,detail,status,actions);card.append(img,info);$('libraryGrid').append(card);
    });
  }
  function openClip(clip){
    selectedClip=clip;$('clipTitle').textContent='Message No. '+String(clip.seq).padStart(3,'0');$('clipLabel').textContent=clip.kind==='real'?(clip.cloud?'REAL RECORDING / CLOUD '+clip.cloud.status.toUpperCase():'REAL RECORDING / LOCAL ONLY'):'DEMO SESSION / NO GUEST VIDEO';
    $('playback').hidden=!clip.blob;$('clipStill').hidden=!!clip.blob;$('videoDownload').hidden=!clip.blob;
    if(playbackURL){URL.revokeObjectURL(playbackURL);playbackURL=null;}
    if(clip.blob){playbackURL=URL.createObjectURL(clip.blob);$('playback').src=playbackURL;}else $('clipStill').src=clip.thumbnail;
    $('clipDetails').textContent=clip.title+' / '+C.timeLabel(clip.durationMs)+' / '+(clip.mime||'Simulation metadata only')+' / '+(clip.sizeBytes/1048576).toFixed(2)+' MB. '+(clip.interrupted?'Interrupted: review this clip. ':'')+(clip.cloud?'Cloud: '+clip.cloud.status+'. ':'Local-only. ')+(clip.sha256?'SHA-256 recorded.':'');
    $('clipDialog').showModal();
  }
  function downloadClip(clip){if(clip?.blob)download(clip.blob,'RetroBooth_'+String(clip.seq).padStart(3,'0')+'_'+clip.id.slice(0,8)+'.'+C.extension(clip.mime));}
  function exitKiosk(){document.body.classList.remove('kiosk');$('exitKiosk').hidden=true;}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  /*__EXPERIENCE__*/
  /*__LANDSCAPE_JS__*/
  /*__APPEARANCE_JS__*/
  /*__CAMERA_LAB_JS__*/
  /*__NATIVE_EXPORT_JS__*/
/*__DESKTOP_JS__*/
  /*__DELIVERY_FLOW_JS__*/
  /*__CLOUD_FLOW_JS__*/
  /*__PRINTER_FLOW_JS__*/

  async function nativeDiagnostics(){
    if(!window.RetroDiagnosticsNative?.postMessage)return {available:false,reason:'No Android native diagnostics bridge (browser or Windows).'};
    const id=C.randomId();const bridge=window.RetroDiagnosticsNative;const old=bridge.onmessage;
    return new Promise(resolve=>{
      const timeout=setTimeout(()=>{bridge.onmessage=old;resolve({available:false,reason:'Android diagnostics response timeout'});},2200);
      bridge.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.id!==id)return;clearTimeout(timeout);bridge.onmessage=old;resolve(RetroDiagnostics.safe(data));}catch{}};
      try{bridge.postMessage(JSON.stringify({id,action:'snapshot'}));}catch(e){clearTimeout(timeout);bridge.onmessage=old;resolve({available:false,reason:e.name||'bridge_error'});}
    });
  }
  async function exportDiagnostics(){
    $('diagExport').disabled=true;
    try{
      log('diagnostic_export_requested',{count:diagnosticRing.events.length});
      const native=await nativeDiagnostics();
      let permissions={};
      if(navigator.permissions?.query){for(const name of ['camera','microphone']){try{permissions[name]=(await navigator.permissions.query({name})).state;}catch{permissions[name]='unavailable';}}}
      const report={schema:'retrobooth-diagnostic-v1',version:'0.9.2-alpha.1',generatedAt:new Date().toISOString(),
        notice:'App-scoped diagnostic data, not Android system logcat. Up to 250 sanitized events survive app restarts where browser storage permits. No videos, snapshots, private QR URLs, credentials or device identifiers are intentionally included. Review before sharing.',
        runtime:{userAgent:navigator.userAgent,secureContext:window.isSecureContext,visibility:document.visibilityState,online:navigator.onLine,platform:navigator.platform,viewport:{width:innerWidth,height:innerHeight},webviewBridge:!!window.RetroDiagnosticsNative,mediaRecorder:!!window.MediaRecorder,canvasCapture:!!$('cameraCanvas').captureStream,renderer:renderer.mode,rendererFps:Number(renderer.fps.toFixed(1)),state,mode,storageAvailable:store.available,cloudConfigured:!!cloudClient?.connection,printerBridge:!!window.RetroPrinterNative,clipCount:clips.length},
        media:{permissions,cameraCount:$('cameraSelect').options.length-1,microphoneCount:$('micSelect').options.length-1,explicitCameraSelected:!!$('cameraSelect').value,explicitMicSelected:!!$('micSelect').value,direction:$('cameraDirection').value,lastFailure:lastMediaFailure},
        native,events:diagnosticRing.snapshot()};
      textDownload(RetroDiagnostics.safe(report),'RetroBooth_Android_Diagnostics_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
      mediaStatus('Diagnostic JSON export requested. Choose a save location; check Downloads/Files after saving.');
    }catch(e){log('diagnostic_export_failed',{name:e.name||'Error',message:e.message||''});toast('Log export failed: '+e.message);}
    finally{$('diagExport').disabled=false;}
  }
  window.addEventListener('error',e=>log('javascript_error',{message:e.message||'Unknown',source:'window',line:e.lineno||0}));
  window.addEventListener('unhandledrejection',e=>log('unhandled_rejection',{name:e.reason?.name||'Error',message:String(e.reason?.message||'Promise rejection')}));


  document.querySelectorAll('[data-view]').forEach(e=>e.addEventListener('click',()=>go(e.dataset.view)));
  document.querySelectorAll('[data-close]').forEach(e=>e.addEventListener('click',()=>$(e.dataset.close).close()));
  $('aboutBtn').onclick=()=>$('aboutDialog').showModal();
  $('handsetBtn').onclick=()=>hook(!offHook);$('touchBtn').onclick=()=>start('touch');$('stopBtn').onclick=()=>stopRecording(false);
  $('cameraBtn').onclick=()=>enableCamera();$('applyDevices').onclick=()=>enableCamera(true);$('deviceRefresh').onclick=refreshDevices;$('testCameraOnly').onclick=()=>probeInput('video');$('testMicOnly').onclick=()=>probeInput('audio');
  $('kioskBtn').onclick=()=>{document.body.classList.add('kiosk');$('exitKiosk').hidden=false;window.scrollTo(0,0);wake();};$('exitKiosk').onclick=exitKiosk;
  $('videoDownload').onclick=()=>downloadClip(selectedClip);
  $('clipReceiptBtn').onclick=async()=>{await displayReceipt(selectedClip);$('clipDialog').close();go('booth');};
  $('clipDialog').addEventListener('close',()=>{$('playback').pause();$('playback').removeAttribute('src');$('playback').load();if(playbackURL){URL.revokeObjectURL(playbackURL);playbackURL=null;}});
  $('receiptDownload').onclick=()=>{if(!lastReceipt)return;$('receiptCanvas').toBlob(b=>{if(b)download(b,'RetroBooth_receipt_'+String(lastReceipt.clip.seq).padStart(3,'0')+'_PREVIEW.png');});};
  $('manifestBtn').onclick=()=>textDownload({version:'0.9.2-alpha.1',note:'Metadata only. This is NOT a video backup. Download real videos separately.',clips:clips.map(({blob,rawSnapshot,thumbnail,...rest})=>rest)},'RetroBooth_manifest_NOT_A_VIDEO_BACKUP.json');
  $('settingsForm').onsubmit=async e=>{
    e.preventDefault();if(state!=='idle'||settingsSaving){toast('Finish the active session or settings save first.');return;}
    const next=C.safeSettings({...settings,title:$('eventTitle').value,date:$('eventDate').value,duration:$('duration').value,preset:$('preset').value,grain:Number($('grain').value)/100,mirror:$('mirror').checked,osd:$('osd').checked,trigger:$('trigger').value,receipt:$('receiptMode').value,...designForm()});
    try{await commitSettings(next);previewDesign();
      if(lastReceipt?.clip.seq===0){lastReceipt.settings=settings;Receipt.render($('receiptCanvas'),sample,lastReceipt.source,settings);}toast(store.available?'Settings saved in this browser.':'Settings changed in memory only.');}
    catch(err){toast('Settings not saved: '+err.message);}
  };
  $('grain').oninput=()=>$('grainValue').textContent=$('grain').value+'%';
  $('failSave').onchange=()=>simulations.failSave=$('failSave').checked;
  $('failPrint').onchange=()=>simulations.failPrint=$('failPrint').checked;
  $('offlineSim').onchange=()=>simulations.offline=$('offlineSim').checked;
  $('retryQueue').onclick=async()=>{
    if(state!=='idle'){toast('Retry only while idle.');return;}
    let count=0;
    for(const clip of clips){if(!clip.simulation)continue;const updated={...clip,simulation:{...clip.simulation}};
      if(!simulations.offline)updated.simulation.upload='simulated_ready';if(!simulations.failPrint)updated.simulation.print='simulated_complete';
      try{await changeClip(clip.id,c=>({...c,simulation:updated.simulation}));count++;}catch(e){toast('Simulation state could not be saved: '+e.message);return;}}
    renderState();toast(count+' simulated jobs updated. No video uploaded and no receipt physically printed.');
  };
  $('diagExport').onclick=exportDiagnostics;
  $('diagClear').onclick=()=>{if(confirm('Clear only this session diagnostic events? Recordings and settings are not affected.')){diagnosticRing.clear();try{localStorage.removeItem(diagStorageKey);}catch{}updateDiagnosticPreview();}};
  $('persistBtn').onclick=async()=>{try{const result=await navigator.storage?.persist?.();toast(result?'Persistent browser storage granted. Keep independent exports.':'Persistence was not granted or is unavailable. Export important recordings.');refreshDiagnostics();}catch(e){toast(e.message);}};
  $('errorDialog').addEventListener('cancel',e=>e.preventDefault());
  $('retrySave').onclick=async()=>{if(state!=='error'||!pending)return;$('errorDialog').close();setState('saving');try{pending.deliverySnapshot=RetroDelivery.snapshot(pending,C.qrPayload(pending.id,pending.cloud));
      await savePending();}catch(e){showError(e.message);}};
  $('recoveryDownload').onclick=()=>downloadClip(pending||selectedClip);
  $('resetError').onclick=()=>{
    if(pending&&!confirm('The pending clip has NOT been saved. Export it first. Discard the in-memory recovery and reset?'))return;
    pending=null;offHook=false;session++;$('errorDialog').close();
    if(stream?.getTracks().some(t=>t.readyState!=='live'))disableCamera(false);
    setState('idle');
  };
  let longPress=null;
  $('adminCorner').addEventListener('pointerdown',()=>{longPress=setTimeout(()=>go('admin'),5000);});
  ['pointerup','pointerleave','pointercancel'].forEach(event=>$('adminCorner').addEventListener(event,()=>clearTimeout(longPress)));
  window.addEventListener('keydown',e=>{
    if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;
    if(e.code==='BracketLeft'||e.key==='['){e.preventDefault();hook(true);}else if(e.code==='BracketRight'||e.key===']'){e.preventDefault();hook(false);}
    // Escape is left to the browser; it must not expose staff navigation from the kiosk.
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      if(state==='recording')stopRecording(true,'Page became hidden or the device was locked.');
      else if(['greeting','countdown'].includes(state)){session++;setState('idle');toast('Preparation cancelled because the page was hidden.');}
      releaseWake();
    }else if(mode==='real')wake();
  });
  window.addEventListener('retro-native-pause',()=>{if(state==='recording')stopRecording(true,'App left foreground or the device suspended.');else if(['greeting','countdown'].includes(state)){session++;setState('idle');}});
  window.addEventListener('beforeunload',e=>{if(busy()||pending){e.preventDefault();e.returnValue='';}});
  window.addEventListener('rendererfailure',e=>{if(state==='recording')stopRecording(true,e.detail);else showError(e.detail);});
  setupExperience();setupLandscape();setupAppearance();setupCameraLab();setupDelivery();setupPrinter();setupDesktop();await setupCloud();
  if(navigator.locks&&surfaceRole==='booth'){
    await new Promise(resolve=>{
      navigator.locks.request('luce-retrobooth-capture',{ifAvailable:true},lock=>{
        if(!lock){tabAllowed=false;toast('Another booth tab is open. Capture is disabled here. Close other tabs and reload.');resolve();return;}
        resolve();return new Promise(()=>{}); // Released by browser on tab close; never a timed lease.
      }).catch(()=>{log('tab_lock_unavailable');resolve();});
    });
  }
  ready=true;log('app_ready',{version:'0.9.2-alpha.1',nativeDiagnostics:!!window.RetroDiagnosticsNative,secureContext:window.isSecureContext});syncForm();renderState();refreshDiagnostics();
  if(surfaceRole==='guest'){openGuest(location.hash.slice(7));}else if(surfaceRole==='show'){go('show');}else{go(new URLSearchParams(location.search).has('setup')?'admin':'booth');}
  if(document.documentElement.dataset.serviceWorker==='true' && location.protocol!=='file:' && 'serviceWorker'in navigator){
    navigator.serviceWorker.register('./sw.js').catch(e=>log('offline_shell_unavailable',{error:e.message}));
  }
  window.RetroApp={
    get status(){return {state,mode,offHook,ready,tabAllowed,clipCount:clips.length,pending:!!pending,view:currentView,renderer:renderer.mode,settings:C.safeSettings(settings),activeLook:RetroEffects.resolve(settings),renderFps:renderer.fps,storageAvailable:store.available,delivery:deliveryStatus()};},
    get clips(){return clips.map(({blob,rawSnapshot,thumbnail,cloud,deliverySnapshot,...rest})=>({...rest,cloudState:cloud?.status||'off',deliverySnapshot:deliverySnapshot?.online?{online:true,clipId:rest.id}:deliverySnapshot}));},
    // Operational handlers exposed to aid repeatable QA; no privileged credentials exist in this build.
    hook,start,stop:stopRecording,go,exportDiagnostics,openGuest,applyScreenStyle,enableCamera,disableCamera,saveEffects,saveDeliverySettings,
    get showId(){return showClipId;},get guestId(){return guestId;}
  };
})();
