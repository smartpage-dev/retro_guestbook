"""v0.4 UI regression. Uses set_content at an opaque origin, not device acceptance.
The storage-contract group injects an explicit in-memory adapter to verify settings
commit/restore/failure handling. It is NOT IndexedDB reload durability evidence.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,os
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--group',choices=['layout','appearance','flow','storage-contract','media'],required=True);args=a.parse_args()
checks=[];errors=[];requests=[]
def check(name,value):
 if not value:raise AssertionError(name)
 checks.append(name);print('PASS',name,flush=True)
def state(p,value,timeout=24000):p.wait_for_function('(s)=>RetroApp.status.state===s',arg=value,timeout=timeout)
def inside(p,selector):
 return p.locator(selector).evaluate('(e)=>{const r=e.getBoundingClientRect(),p=e.closest(".control-panel").getBoundingClientRect();return r.left>=p.left&&r.top>=p.top&&r.right<=p.right+1&&r.bottom<=p.bottom+1}')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1);page.set_default_timeout(9000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 html=(R/'dist/RetroBooth_Prototype.html').read_text()
 if args.group=='storage-contract':
  injection='''window.__storageFixture={value:RetroCore.safeSettings({screenStyle:'edge',duration:30,preset:'mono',receiptStyle:'ticket'}),fail:false,delay:0};
BrowserStore.prototype.open=async function(){this.available=true;return true;};
BrowserStore.prototype.getSettings=async function(){return {key:'event',value:structuredClone(__storageFixture.value)};};
BrowserStore.prototype.list=async function(){return [];};
BrowserStore.prototype.getSequence=async function(){return {next:1};};
BrowserStore.prototype.setSettings=async function(value){await new Promise(r=>setTimeout(r,__storageFixture.delay));if(__storageFixture.fail)throw new Error('Injected settings write failure');__storageFixture.value=structuredClone(value);};
'''
  html=html.replace('(async function () {',injection+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready');page.wait_for_timeout(250)
 if args.group=='layout':
  geometries=[]
  for style in ['heritage','edge']:
   page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style)
   for w,h in [(1920,1080),(1366,768),(1280,720),(1024,600),(800,360),(1920,1200),(3840,2160),(390,844),(320,720)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);prefix=f'{style} {w}x{h} '
    check(prefix+'no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check(prefix+'one enabled guest action',page.locator('.guest-actions button:visible').count()==1 and page.locator('#touchBtn').is_enabled())
    check(prefix+'staff and receipt hidden',page.locator('.site-header').is_hidden() and page.locator('.receipt-column').is_hidden())
    check(prefix+'privacy disclosure visible',page.locator('.privacy-line').is_visible())
    check(prefix+'button is a usable touch target',page.locator('#touchBtn').evaluate('e=>e.offsetWidth>=44&&e.offsetHeight>=44'))
    check(prefix+'screen appearance applied',page.locator('body').get_attribute('data-screen-style')==style)
    if w>h:
     check(prefix+'no vertical scroll',page.evaluate('document.documentElement.scrollHeight<=innerHeight+1'))
     check(prefix+'television face fills viewport',page.locator('.television').evaluate('e=>{const r=e.getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight}'))
     for selector in ['#touchBtn','#panelTimer','.panel-footer','.panel-lamps']:
      check(prefix+selector+' not clipped by panel',inside(page,selector))
     check(prefix+'picture matches capture aspect',page.evaluate('Math.abs(cameraCanvas.width/cameraCanvas.height-document.getElementById("screen").clientWidth/document.getElementById("screen").clientHeight)<.004'))
     check(prefix+'curved CRT frame and picture inset',page.locator('.tv-bezel').evaluate('e=>parseFloat(getComputedStyle(e).padding)>0&&parseFloat(getComputedStyle(e).borderRadius)>0'))
    geometries.append({'style':style,'viewport':[w,h],'bounds':page.evaluate('Object.fromEntries(["#screen",".control-panel","#touchBtn"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y,width:r.width,height:r.height}]}))')})
    if (w,h) in [(1920,1080),(1280,720),(800,360),(390,844),(320,720)]:page.screenshot(path=str(Q/f'{style}-{w}.png'),full_page=True)
  page.evaluate('RetroApp.go("admin")')
  for w,h in [(1440,1100),(800,700),(390,844),(320,720)]:
   page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150)
   check(f'Admin {w} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(f'Admin {w} both style cards visible',page.locator('.style-option:visible').count()==2)
   check(f'Admin {w} current viewport labels',page.locator('#viewportInfo').inner_text().startswith(f'{w} x {h}'))
   if w in [1440,390]:page.screenshot(path=str(Q/f'admin-{w}.png'),full_page=True)
  (Q/'geometries.json').write_text(json.dumps(geometries,indent=2))
 elif args.group=='appearance':
  check('new preview starts with Heritage',page.evaluate('RetroApp.status.settings.screenStyle==="heritage"'))
  heritageBounds=page.locator('#screen').bounding_box()
  original=page.evaluate('RetroApp.status.settings')
  for i in range(5):page.locator('#staffEntry').click()
  check('five version taps open Admin',page.locator('#view-admin').is_visible())
  check('two native radio style options',page.locator('input[name=screenStyle]').count()==2)
  page.locator('#styleEdge').check()
  check('choice is draft until Apply',page.evaluate('RetroApp.status.settings.screenStyle==="heritage"'))
  page.locator('#screenStyleSave').click();page.wait_for_function('RetroApp.status.view==="booth"');page.wait_for_timeout(250)
  check('Apply switches to Edge and returns to booth',page.evaluate('RetroApp.status.settings.screenStyle==="edge"&&RetroApp.status.view==="booth"'))
  after=page.evaluate('RetroApp.status.settings');after.pop('screenStyle');original.pop('screenStyle')
  check('style switch preserves all other settings',after==original)
  check('Modern CRT shares Heritage picture geometry',all(abs(page.locator('#screen').bounding_box()[k]-heritageBounds[k])<1 for k in ['x','y','width','height']))
  check('no recording created by switch',page.evaluate('RetroApp.clips.length===0'))
  page.evaluate('RetroApp.go("admin")');page.locator('#duration').select_option('30');page.locator('#receiptStyle').select_option('ticket');page.locator('#preset').select_option('mono',force=True);page.locator('#settingsForm button[type=submit]').click()
  check('event settings submit preserves selected screen style',page.evaluate('RetroApp.status.settings.screenStyle==="edge"'))
  before=page.evaluate('RetroApp.status.settings');page.locator('#styleHeritage').check();page.locator('#screenStyleSave').click();page.wait_for_function('RetroApp.status.view==="booth"')
  after=page.evaluate('RetroApp.status.settings');after.pop('screenStyle');before.pop('screenStyle')
  check('Heritage does not reset duration receipt or camera preset',after==before)
  check('new duration visible after skin switch',page.locator('#panelTimer').inner_text()=='00:30')
  check('invalid appearance value rejected',page.evaluate('async()=>{try{await RetroApp.applyScreenStyle("bad");return false}catch{return RetroApp.status.settings.screenStyle==="heritage"}}'))
  check('chrome colour is not a CSS filter on capture canvas',page.locator('#cameraCanvas').evaluate('e=>getComputedStyle(e).filter==="none"'))
  check('selection restored on revisiting Admin',page.evaluate('RetroApp.go("admin")') is None and page.locator('#styleHeritage').is_checked())
  check('fallback persistence is disclosed', 'memory' in page.locator('#toast').inner_text().lower() or 'not saved' in page.locator('#toast').inner_text().lower())
 elif args.group=='storage-contract':
  check('saved style restored instead of preview default',page.evaluate('RetroApp.status.settings.screenStyle==="edge"&&document.body.dataset.screenStyle==="edge"'))
  check('restored independent settings retained',page.evaluate('RetroApp.status.settings.duration===30&&RetroApp.status.settings.receiptStyle==="ticket"&&RetroApp.status.settings.preset==="mono"'))
  page.evaluate('RetroApp.applyScreenStyle("heritage")')
  check('style uses settings adapter commit',page.evaluate('__storageFixture.value.screenStyle==="heritage"'))
  before=page.evaluate('RetroApp.status.settings')
  page.evaluate('__storageFixture.fail=true')
  result=page.evaluate('async()=>{try{await RetroApp.applyScreenStyle("edge");return false}catch{return true}}')
  check('adapter write failure is surfaced',result)
  check('failed commit leaves active theme and settings intact',page.evaluate('RetroApp.status.settings')==before and page.locator('body').get_attribute('data-screen-style')=='heritage')
  check('failed commit restores usable Start',page.locator('#touchBtn').is_enabled())
  page.evaluate('__storageFixture.fail=false;__storageFixture.delay=600;window.__saveDone=false;RetroApp.applyScreenStyle("edge").then(()=>__saveDone=true);void 0')
  check('Start disabled during asynchronous settings commit',page.locator('#touchBtn').is_disabled())
  page.evaluate('RetroApp.start("touch")')
  check('programmatic start also blocked while settings commit',page.evaluate('RetroApp.status.state==="idle"'))
  check('concurrent settings commit rejected',page.evaluate('async()=>{try{await RetroApp.applyScreenStyle("heritage");return false}catch{return true}}'))
  page.wait_for_function('__saveDone');check('successful commit re-arms Start',page.locator('#touchBtn').is_enabled())
  check('final persisted style agrees with active UI',page.evaluate('__storageFixture.value.screenStyle===RetroApp.status.settings.screenStyle&&document.body.dataset.screenStyle==="edge"'))
  # Simulated page reconstruction against an explicit stored fixture, not real IndexedDB.
  fixture=page.evaluate('__storageFixture.value');seed=json.dumps(fixture)
  reload_html=html.replace("RetroCore.safeSettings({screenStyle:'edge',duration:30,preset:'mono',receiptStyle:'ticket'})",seed)
  page.set_content(reload_html);page.wait_for_function('window.RetroApp?.status.ready');page.wait_for_timeout(150)
  check('adapter fixture is reloaded into new controller',page.evaluate('RetroApp.status.settings')==fixture)
 elif args.group=='flow':
  for index,style in enumerate(['heritage','edge']):
   page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style);page.wait_for_timeout(150)
   page.locator('#touchBtn').click();state(page,'countdown')
   check(style+' Start immediately disabled',page.locator('#touchBtn').is_disabled())
   state(page,'recording');page.wait_for_timeout(900)
   check(style+' only visible button remains locked',page.locator('.guest-actions button:visible').count()==1 and page.locator('#touchBtn').is_disabled())
   check(style+' recording label and timer',page.locator('#panelStartLabel').inner_text()=='REC' and page.locator('#panelTimer').inner_text() in ['00:10','00:09','00:08'])
   old=page.evaluate('RetroApp.status.settings.screenStyle')
   check(style+' refuses active-session theme changes',page.evaluate('async()=>{try{await RetroApp.applyScreenStyle(RetroApp.status.settings.screenStyle==="edge"?"heritage":"edge");return false}catch{return true}}'))
   check(style+' theme unchanged on rejected switch',page.evaluate('RetroApp.status.settings.screenStyle')==old)
   page.evaluate('RetroApp.start("touch");RetroApp.start("touch")')
   check(style+' double starts ignored',page.evaluate('RetroApp.status.state==="recording"'))
   if style=='heritage':
    page.screenshot(path=str(Q/'heritage-recording-1920.png'))
    dims=page.locator('#cameraCanvas').evaluate('c=>[c.width,c.height]');page.set_viewport_size({'width':800,'height':360});page.wait_for_timeout(250)
    check('mid-session resize freezes encoded dimensions',page.locator('#cameraCanvas').evaluate('c=>[c.width,c.height]')==dims)
    check('mid-session resize contains rather than stretches',page.locator('#cameraCanvas').evaluate('e=>getComputedStyle(e).objectFit==="contain"'))
    page.set_viewport_size({'width':1920,'height':1080})
   state(page,'qr')
   check(style+' one full fixed ten-second message',page.evaluate('(n)=>RetroApp.clips.length===n&&RetroApp.clips.at(-1).durationMs>=10000&&RetroApp.clips.at(-1).durationMs<12500',index+1))
   check(style+' no immediate playback',not page.locator('#clipDialog').evaluate('e=>e.open'))
   check(style+' no false printed/uploaded claims',page.evaluate('RetroApp.clips.at(-1).printState==="not_connected"&&RetroApp.clips.at(-1).uploadState==="not_configured"'))
   check(style+' receipt settings frozen per clip',page.evaluate('(s)=>RetroApp.clips.at(-1).settings?.screenStyle===s',style))
   if style=='heritage':page.screenshot(path=str(Q/'heritage-thanks-1920.png'))
   state(page,'idle');check(style+' auto re-arms Start',page.locator('#touchBtn').is_enabled())
  check('two unique messages sequential across style switch',page.evaluate('RetroApp.clips.length===2&&RetroApp.clips[0].id!==RetroApp.clips[1].id&&RetroApp.clips[1].seq===2'))
  check('show privacy remains private/pending',page.evaluate('RetroApp.clips.every(c=>c.guestPermission==="private"&&c.moderation==="pending")'))
 elif args.group=='media':
  results=[]
  for style in ['heritage','edge']:
   page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style);page.wait_for_timeout(300)
   result=page.evaluate('''async()=>{const canvas=document.getElementById('cameraCanvas');const stream=canvas.captureStream(15);const a=new AudioContext();await a.resume();const osc=a.createOscillator(),dest=a.createMediaStreamDestination();osc.frequency.value=440;osc.connect(dest);osc.start();const media=new MediaStream([...stream.getVideoTracks(),...dest.stream.getAudioTracks()]);const mime=RetroCore.chooseMime(m=>MediaRecorder.isTypeSupported(m));const rec=new MediaRecorder(media,mime?{mimeType:mime}:{});const parts=[];rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};const blob=await new Promise((resolve,reject)=>{rec.onstop=()=>resolve(new Blob(parts,{type:rec.mimeType}));rec.onerror=reject;rec.start(200);setTimeout(()=>rec.stop(),1300)});const url=URL.createObjectURL(blob),v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=url;await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject});await v.play();await new Promise(r=>setTimeout(r,200));const result={bytes:blob.size,mime:blob.type,width:v.videoWidth,height:v.videoHeight,playing:!v.paused&&v.currentTime>0,canvas:[canvas.width,canvas.height]};v.pause();v.removeAttribute('src');v.load();URL.revokeObjectURL(url);osc.stop();media.getTracks().forEach(t=>t.stop());await a.close();return result;}''')
   check(style+' synthetic media nonempty',result['bytes']>1000)
   check(style+' canvas encoding matches picture dimensions',[result['width'],result['height']]==result['canvas'])
   check(style+' synthetic clip playback progresses',result['playing'])
   results.append({'style':style,**result})
  (Q/'synthetic-media.json').write_text(json.dumps(results,indent=2))
 check('no JavaScript runtime errors',not errors)
 check('no external HTTP requests',not [x for x in requests if x.startswith(('http:','https:'))])
 (Q/f'v04-{args.group}.json').write_text(json.dumps({'group':args.group,'passed':len(checks),'checks':checks,'errors':errors,'requests':requests,'scope':'Linux Chromium set_content; Canvas2D fallback; demo memory. Storage-contract uses a labeled adapter fixture. No hardware, real IndexedDB durability, cloud, or production acceptance.'},indent=2))
 print('TOTAL',len(checks),'PASSED',flush=True);b.close()
