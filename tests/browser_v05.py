"""Scoped v0.5 tests. Opaque-origin unit/UI harness; synthetic media and mock storage are labelled.
No real permissions, IndexedDB, Android, USB or hardware acceptance is implied.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,os,base64
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--group',choices=['effects-ui','pixels','webcam-synthetic','camera-errors','native-export'],required=True);args=a.parse_args()
checks=[];errors=[]
def check(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name);print('PASS',name,flush=True)
def state(p,value):p.wait_for_function('(s)=>RetroApp.status.state===s',arg=value,timeout=25000)
fixture=r'''
// TEST FIXTURES ONLY: no IDB durability or hardware permission evidence.
window.__fx={settings:RetroCore.safeSettings({countdown:0,returnSeconds:1,osd:false}),clips:[],next:1,fail:false,delay:0,mediaError:'',videoOnly:false,streams:[],constraints:[],failMic:false,failCam:false};
BrowserStore.prototype.open=async function(){this.available=true;return true;};
BrowserStore.prototype.getSettings=async()=>({value:structuredClone(__fx.settings)});
BrowserStore.prototype.setSettings=async value=>{await new Promise(r=>setTimeout(r,__fx.delay));if(__fx.fail)throw new Error('Fixture storage failure');__fx.settings=structuredClone(value);};
BrowserStore.prototype.list=async()=>__fx.clips.slice();
BrowserStore.prototype.getSequence=async()=>({next:__fx.next});
BrowserStore.prototype.saveClip=async clip=>{if(__fx.fail)throw new Error('Fixture storage failure');if(!__fx.clips.some(c=>c.id===clip.id))__fx.clips.push(clip);__fx.next=Math.max(__fx.next,clip.seq+1);};
BrowserStore.prototype.getClip=async id=>__fx.clips.find(c=>c.id===id);
BrowserStore.prototype.mutateClip=async(id,fn)=>{const i=__fx.clips.findIndex(c=>c.id===id);return __fx.clips[i]=fn(__fx.clips[i]);};
Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});
Object.defineProperty(navigator,'mediaDevices',{value:{
 enumerateDevices:async()=>[{kind:'videoinput',deviceId:'fixture-camera',label:'Synthetic test input (NOT hardware)'},{kind:'audioinput',deviceId:'fixture-mic',label:'Synthetic 330 Hz audio (NOT microphone)'}],
 getUserMedia:async constraints=>{
  __fx.constraints.push(constraints);if(__fx.mediaError)throw new DOMException('Fixture rejection',__fx.mediaError);
  if(constraints.audio!==false&&__fx.failMic)throw new DOMException('Could not start audio source','NotReadableError');
  if(constraints.video!==false&&__fx.failCam)throw new DOMException('Could not start video source','NotReadableError');
  const c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d');let step=0;
  const draw=()=>{x.fillStyle='#ddd8c8';x.fillRect(0,0,1280,720);const cols=['#bd6358','#d3af68','#75997e','#578992','#d4a88b','#8a7898'];cols.forEach((v,i)=>{x.fillStyle=v;x.fillRect(i*214,0,214,410)});for(let i=0;i<16;i++){x.fillStyle=`rgb(${i*17},${i*17},${i*17})`;x.fillRect(i*80,410,80,120);}x.fillStyle='#17281f';x.font='bold 32px monospace';x.fillText('SYNTHETIC INPUT / NOT A REAL WEBCAM',120,600);x.font='24px monospace';x.fillText('LIVE PIPELINE + AUDIO FIXTURE',120,650);x.fillStyle='#fff7dd';x.fillRect(80+(step++%100)*9,350,80,36);};draw();
  const stream=c.captureStream(24);let timer=null;
  if(constraints.video===false){stream.getVideoTracks().forEach(t=>{stream.removeTrack(t);t.stop();});}
  else{timer=setInterval(draw,45);stream.getVideoTracks()[0].addEventListener('ended',()=>clearInterval(timer));}
  let ac=null,osc=null;
  if(constraints.audio!==false&&!__fx.videoOnly){
    ac=new AudioContext();await ac.resume();osc=ac.createOscillator();const dest=ac.createMediaStreamDestination();
    osc.frequency.value=330;osc.connect(dest);osc.start();stream.addTrack(dest.stream.getAudioTracks()[0]);
  }
  __fx.streams.push({stream,ac,osc,timer});return stream;
 }
},configurable:true});
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'dist/RetroBooth_Prototype.html').read_text()
 if args.group!='pixels':html=html.replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready');page.wait_for_timeout(200)
 if args.group=='effects-ui':
  check('default Heritage uses subdued camera palette',page.evaluate('RetroApp.status.activeLook.key==="heritage"&&RetroApp.status.activeLook.saturation<.1'))
  page.evaluate('RetroApp.go("admin")')
  check('staff camera lab is available',page.locator('#effectsForm').is_visible())
  page.evaluate('RetroApp.start("touch")');page.wait_for_timeout(100)
  check('Admin view blocks physical/programmatic session start',page.evaluate('RetroApp.status.state==="idle"'))
  saved=page.evaluate('RetroApp.status.settings')
  page.locator('#fx_grain').fill('9');page.locator('#fx_grain').dispatch_event('input')
  check('draft look does not mutate saved settings',page.evaluate('RetroApp.status.settings')==saved)
  page.locator('#effectsReturn').click();page.wait_for_function('RetroApp.status.view==="booth"')
  check('look saves and returns without resetting event',page.evaluate('RetroApp.status.settings.lookProfiles.heritage.grain===.09&&RetroApp.status.settings.duration===10'))
  page.evaluate('RetroApp.applyScreenStyle("edge")');check('style switch selects colour film',page.evaluate('RetroApp.status.activeLook.key==="film"'))
  check('both profiles retained independently',page.evaluate('RetroApp.status.settings.lookProfiles.heritage.grain===.09&&RetroApp.status.settings.lookProfiles.film.grain===.035'))
  page.evaluate('RetroApp.go("admin")');page.locator('#fx_scan').fill('25');page.locator('#fx_scan').dispatch_event('input');page.locator('#discardLook').click()
  check('discard restores saved look',page.evaluate('RetroApp.status.settings.lookProfiles.film.scan===.085'))
  page.evaluate('RetroApp.go("admin")');page.locator('#lookMode').select_option('bw')
  check('neutral BW controls stay neutral',page.locator('#fx_warmth').is_disabled() and page.locator('#fx_saturation').is_disabled())
  page.locator('#effectsReturn').click();page.wait_for_function('RetroApp.status.view==="booth"')
  page.evaluate('RetroApp.applyScreenStyle("heritage")')
  check('manual BW override survives shell switch',page.evaluate('RetroApp.status.activeLook.key==="bw"'))
  page.evaluate('RetroApp.go("admin")');page.locator('#lookMode').select_option('follow');page.evaluate('__fx.fail=true');page.locator('#effectsForm button[type=submit]').click();page.wait_for_timeout(150)
  check('failed save is reported and not applied',page.evaluate('RetroApp.status.settings.lookMode==="bw"') and 'Not saved' in page.locator('#effectsSaveStatus').inner_text())
  page.evaluate('__fx.fail=false');page.locator('#effectsReturn').click();page.wait_for_function('RetroApp.status.view==="booth"')
  page.evaluate('RetroApp.go("admin")')
  for w,h in [(1920,1080),(800,720),(390,844),(320,720)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150)
   check(str(w)+' Camera Lab has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.set_viewport_size({'width':1440,'height':1000});page.locator('#effectsForm').scroll_into_view_if_needed();page.screenshot(path=str(Q/'v05-camera-lab.png'))
 elif args.group=='pixels':
  data=page.evaluate('''()=>{
   const results=[];for(const mode of ['film','heritage','bw']){
    const c=document.createElement('canvas'),v=document.createElement('video'),settings=RetroCore.safeSettings({lookMode:mode,osd:false,lookProfiles:{[mode]:{grain:0,scan:0}}});
    const r=new RetroRenderer(c,v,settings,{backend:'2d'});r.running=false;r.artwork=()=>{r.rawCtx.fillStyle='rgb(180,90,70)';r.rawCtx.fillRect(0,0,r.w,r.h)};r.draw(0);
    const pixel=Array.from(c.getContext('2d').getImageData(Math.floor(r.w/2),Math.floor(r.h/2)+2,1,1).data).slice(0,3);
    const expected=RetroEffects.transform(180,90,70,RetroEffects.resolve(settings));
    r.settings=RetroCore.safeSettings({...settings,lookProfiles:{...settings.lookProfiles,[mode]:{...settings.lookProfiles[mode],grain:.12}}});r.draw(1);
    const a=Array.from(c.getContext('2d').getImageData(100,100,80,80).data);r.draw(2);const b=Array.from(c.getContext('2d').getImageData(100,100,80,80).data);
    r.settings=RetroCore.safeSettings({...settings,lookProfiles:{...settings.lookProfiles,[mode]:{...settings.lookProfiles[mode],grain:0,scan:.3}}});r.draw(2);
    const sc=c.getContext('2d'),line=Array.from(sc.getImageData(Math.floor(r.w/2),Math.floor(r.h/2/4)*4,1,1).data),between=Array.from(sc.getImageData(Math.floor(r.w/2),Math.floor(r.h/2/4)*4+1,1,1).data);
    results.push({mode,pixel,expected,noiseChanges:a.filter((n,i)=>n!==b[i]).length,scanDark:line[0]<between[0]-10,backend:r.mode});
   }return results;
  }''')
  for d in data:
   check(d['mode']+' CPU pixels match shared grade math',max(abs(a-b) for a,b in zip(d['pixel'],d['expected']))<4)
   check(d['mode']+' snow actually moves between frames',d['noiseChanges']>100)
   check(d['mode']+' scanlines darken horizontal rows',d['scanDark'])
  check('film remains more colourful than soft mono',max(data[0]['pixel'])-min(data[0]['pixel'])>3*(max(data[1]['pixel'])-min(data[1]['pixel'])))
  check('BW actual pixels are neutral',max(data[2]['pixel'])==min(data[2]['pixel']))
  (Q/'v05-pixel-details.json').write_text(json.dumps(data,indent=2))
 elif args.group=='webcam-synthetic':
  media=[]
  page.evaluate('RetroApp.go("admin")');page.locator('#cameraLabEnable').click();page.wait_for_function('RetroApp.status.mode==="real"');page.wait_for_timeout(400)
  check('webcam controller accepts synthetic video plus audio',page.evaluate('RetroApp.status.mode==="real"'))
  check('camera and microphone choices populate after enable',page.locator('#cameraSelect option').count()==2 and page.locator('#micSelect option').count()==2)
  check('microphone meter responds to synthetic audio',page.locator('#micMeter').evaluate('m=>m.value>0'))
  for index,style in enumerate(['edge','heritage']):
   page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style);page.evaluate('RetroApp.go("admin")');page.wait_for_timeout(300)
   page.locator('#effectsForm').scroll_into_view_if_needed();page.screenshot(path=str(Q/f'v05-{style}-synthetic-lab.png'))
   page.locator('#compareRaw').check();page.wait_for_timeout(160)
   check(style+' raw comparison explicitly labelled', 'RAW COMPARISON' in page.locator('#cameraLabState').inner_text())
   page.locator('#compareRaw').uncheck();page.evaluate('RetroApp.go("booth")');page.set_viewport_size({'width':1920,'height':1080});page.wait_for_timeout(200)
   page.screenshot(path=str(Q/f'v05-{style}-synthetic-live.png'));page.locator('#touchBtn').click();state(page,'recording')
   check(style+' controls lock during capture',page.locator('#touchBtn').is_disabled())
   check(style+' cannot change active look while recording',page.evaluate('async()=>{try{await RetroApp.saveEffects();return false}catch{return true}}'))
   state(page,'qr');state(page,'idle')
   clip=page.evaluate('RetroApp.clips.at(-1)')
   check(style+' full fixed duration recorded',10000<=clip['durationMs']<16000)
   check(style+' finalized actual encoded blob',clip['kind']=='real' and clip['sizeBytes']>1000 and clip['validation']['status']=='metadata_readable')
   check(style+' resolved look frozen in metadata',clip['captureLook']['key']==('film' if style=='edge' else 'heritage'))
   check(style+' no print or upload success claimed',clip['printState']=='not_connected' and clip['uploadState']=='not_configured')
   page.evaluate('RetroApp.go("library")');page.get_by_role('button',name='Play / export',exact=True).last.click()
   page.locator('#playback').evaluate('async v=>{v.muted=true;await v.play()}');page.wait_for_timeout(300)
   check(style+' saved media plays',page.locator('#playback').evaluate('v=>!v.paused&&v.currentTime>0'))
   encoded=page.evaluate('''async()=>{const b=__fx.clips.at(-1).blob,bytes=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return {data:btoa(s),mime:b.type};}''')
   ext='mp4' if 'mp4' in encoded['mime'] else 'webm';(Q/f'SYNTHETIC_{style}.{ext}').write_bytes(base64.b64decode(encoded['data']))
   media.append({'style':style,'mime':clip['mime'],'bytes':clip['sizeBytes'],'durationMs':clip['durationMs'],'validation':clip['validation']})
   page.locator('#clipDialog [data-close]').click();page.evaluate('RetroApp.go("booth")');page.set_viewport_size({'width':1440,'height':1000})
  check('two sequential real-codepath synthetic clips',page.evaluate('__fx.clips.length===2&&__fx.clips[1].seq===2'))
  (Q/'v05-encoded-synthetic-details.json').write_text(json.dumps(media,indent=2))
 elif args.group=='camera-errors':
  page.evaluate('RetroApp.go("admin")')
  for name,expected in [('NotAllowedError','Permission denied'),('NotFoundError','No usable'),('NotReadableError','Device is busy'),('OverconstrainedError','selected device')]:
   page.evaluate('(n)=>__fx.mediaError=n',name);page.locator('#cameraLabEnable').click();page.wait_for_timeout(700 if name in ('NotReadableError','OverconstrainedError') else 160)
   check(name+' actionable message',expected in page.locator('#mediaDeviceStatus').inner_text())
   check(name+' does not pretend camera is on',page.evaluate('RetroApp.status.mode==="demo"'))
  page.evaluate('__fx.mediaError="";__fx.videoOnly=true');page.locator('#cameraLabEnable').click();page.wait_for_timeout(300)
  check('missing audio leaves camera PREVIEW ONLY',page.evaluate('RetroApp.status.mode==="preview"') and 'microphone failed' in page.locator('#toast').inner_text())
  check('no silent guest Start while camera preview active',page.locator('#touchBtn').is_disabled())
  check('audio candidate does not leak extra video',page.evaluate('__fx.streams.at(-1).stream.getTracks().every(t=>t.readyState==="ended")'))
  page.evaluate('__fx.videoOnly=false');page.locator('#cameraLabEnable').click();page.wait_for_function('RetroApp.status.mode==="real"')
  page.locator('#cameraSelect').select_option('fixture-camera');page.locator('#micSelect').select_option('fixture-mic');page.locator('#applyDevices').click();page.wait_for_timeout(300)
  check('selected webcam and microphone requested separately',page.evaluate('__fx.constraints.at(-2).video.deviceId.exact==="fixture-camera"&&__fx.constraints.at(-2).audio===false&&__fx.constraints.at(-1).video===false&&__fx.constraints.at(-1).audio.deviceId.exact==="fixture-mic"'))
  page.locator('#cameraLabStop').click();check('operator can turn off all tracks',page.evaluate('RetroApp.status.mode==="demo"&&__fx.streams.at(-1).stream.getTracks().every(t=>t.readyState==="ended")'))
 elif args.group=='native-export':
  page.add_script_tag(content="const C=RetroCore;function toast(x){window.__nativeToast=x;}\n"+(R/'src/native-export.js').read_text())
  result=page.evaluate('''async()=>{const bytes=new Uint8Array(150000).map((_,i)=>i%251),calls=[];let n=0;window.RetroNative={onmessage:null,postMessage(text){const m=JSON.parse(text);calls.push(m);if(m.type==='chunk')n+=atob(m.base64).length;setTimeout(()=>this.onmessage?.({data:JSON.stringify({id:m.id,bytes:m.type==='finish'?n:0})}),0);}};await exportToAndroid(new Blob([bytes],{type:'video/webm'}),'test.webm');return {types:calls.map(c=>c.type),indices:calls.filter(c=>c.type==='chunk').map(c=>c.index),bytes:n};}''')
  check('native bridge begins chunks then finishes',result['types']==['begin','chunk','chunk','chunk','chunk','finish'])
  check('native chunks are sequenced',result['indices']==[0,1,2,3])
  check('native exported byte count matches',result['bytes']==150000)
  check('native completion is reported after finish ack', 'Export complete' in page.evaluate('__nativeToast'))
  check('native cancellation rejects instead of false success',page.evaluate('''async()=>{RetroNative.postMessage=function(t){const m=JSON.parse(t);if(m.type!=='abort')setTimeout(()=>this.onmessage?.({data:JSON.stringify({id:m.id,error:'Export cancelled'})}),0);};try{await exportToAndroid(new Blob(['a'],{type:'application/json'}),'test.json');return false}catch(e){return e.message.includes('cancelled')}}'''))
 check('no JavaScript runtime errors',not errors)
 (Q/f'v05-{args.group}.json').write_text(json.dumps({'group':args.group,'passed':len(checks),'checks':checks,'errors':errors,'scope':'Chromium set_content; shared CPU compositor. Mock storage and synthetic media fixtures where applicable. No real device/permissions/IDB/native execution.'},indent=2))
 print('TOTAL',len(checks),'PASSED',flush=True);b.close()
