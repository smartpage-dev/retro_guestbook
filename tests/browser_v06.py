"""v0.6 hand-off tests: opaque-origin Chromium, mock storage, synthetic media only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,json,os,time,re
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--group',choices=['settings','branches','timers','layout','webcam-guard'],required=True);args=a.parse_args()
checks=[];errors=[];requests=[]
def check(n,v):
 if not v:raise AssertionError(n)
 checks.append(n);print('PASS '+n,flush=True)
def state(p,s,timeout=18000):p.wait_for_function('(s)=>RetroApp.status.state===s',arg=s,timeout=timeout)
fixture=re.search(r"fixture=r'''([\s\S]*?)'''",(R/'tests/browser_v05.py').read_text()).group(1)
fixture=fixture.replace('countdown:0,returnSeconds:1,osd:false','countdown:0,returnSeconds:0,osd:false,qrDisplaySeconds:5')
def config(p,**kw):
 p.evaluate('RetroApp.go("admin")');p.evaluate('(s)=>RetroApp.saveDeliverySettings(s)',kw)
def scenario(p,value):p.locator('#deliveryScenario').select_option(value)
def capture(p):
 p.evaluate('RetroApp.go("booth")');p.locator('#touchBtn').click();state(p,'recording');p.wait_for_timeout(2150);p.evaluate('RetroApp.stop()')
def leave(p):p.evaluate('window.dispatchEvent(new Event("pagehide"))');state(p,'idle')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1920,'height':1080});page.set_default_timeout(10000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
 if args.group=='settings':
  check('new defaults preserve effects',page.evaluate('RetroApp.status.settings.postRecordMode==="smart"&&!RetroApp.status.settings.receiptPrintEnabled&&RetroApp.status.settings.lookMode==="follow"'))
  page.evaluate('RetroApp.go("admin")');before=page.evaluate('RetroApp.status.settings')
  page.locator('#qrDisplaySeconds').fill('17');page.locator('#printWaitSeconds').fill('3');page.locator('#receiptPrintEnabled').check()
  check('QR form only changes draft',page.evaluate('RetroApp.status.settings')==before)
  page.locator('#deliveryForm button[type=submit]').click();page.wait_for_function('RetroApp.status.settings.qrDisplaySeconds===17')
  check('form saves QR and wait times',page.evaluate('RetroApp.status.settings.qrDisplaySeconds===17&&RetroApp.status.settings.printWaitSeconds===3'))
  after=page.evaluate('RetroApp.status.settings');check('unrelated settings preserved',all(before[k]==after[k] for k in before if k not in ['qrDisplaySeconds','printWaitSeconds','receiptPrintEnabled']))
  check('new fields persisted in mock',page.evaluate('__fx.settings.qrDisplaySeconds===17&&__fx.settings.receiptPrintEnabled'))
  page.locator('#qrDisplaySeconds').fill('25');page.evaluate('__fx.fail=true');page.locator('#deliveryForm button[type=submit]').click();page.wait_for_timeout(200)
  check('failed save preserves previous values',page.evaluate('RetroApp.status.settings.qrDisplaySeconds===17'))
  check('failed save reported','Not saved' in page.locator('#deliverySaveStatus').inner_text())
  page.evaluate('__fx.fail=false;__fx.delay=500;void RetroApp.saveDeliverySettings({qrDisplaySeconds:8})');page.evaluate('RetroApp.go("booth");RetroApp.start("touch")')
  check('start blocked during settings save',page.evaluate('RetroApp.status.state==="idle"') and page.locator('#touchBtn').is_disabled())
  page.wait_for_function('RetroApp.status.settings.qrDisplaySeconds===8');check('start enabled after save',page.locator('#touchBtn').is_enabled())
  saved=page.evaluate('__fx.settings');html2=html.replace('settings:RetroCore.safeSettings({countdown:0,returnSeconds:0,osd:false,qrDisplaySeconds:5})','settings:'+json.dumps(saved))
  page.set_content(html2);page.wait_for_function('window.RetroApp?.status.ready')
  check('settings restored from mock adapter',page.evaluate('RetroApp.status.settings.qrDisplaySeconds===8'))
  check('scenario resets after reload',page.locator('#deliveryScenario').input_value()=='not_connected')
 elif args.group=='branches':
  config(page,receiptPrintEnabled=True,qrDisplaySeconds=5,printWaitSeconds=1)
  for name,stage in [('connected_only','qr'),('sent_unconfirmed','qr'),('outcome_unknown','qr'),('failed_before_send','qr'),('timeout','qr'),('printed_confirmed','idle')]:
   page.evaluate('RetroApp.go("admin")');scenario(page,name);n=page.evaluate('RetroApp.clips.length');capture(page);state(page,stage)
   check(name+' saves exactly once',page.evaluate('(n)=>RetroApp.clips.length===n+1',n))
   if stage=='qr':
    check(name+' QR visible',page.locator('#deliveryOverlay').is_visible())
    check(name+' truthful reason',page.evaluate('RetroApp.status.delivery.reason')==name)
    check(name+' Start locked',page.locator('#touchBtn').is_disabled())
    if name=='timeout':
     id=page.evaluate('RetroApp.status.delivery.clipId');page.wait_for_timeout(1500)
     check('late result cannot replace QR',page.evaluate('(id)=>RetroApp.status.state==="qr"&&RetroApp.status.delivery.clipId===id',id))
    leave(page)
   else:
    check('confirmed demo bypasses QR',page.locator('#deliveryOverlay').is_hidden())
    check('zero thanks returns immediately',page.locator('#touchBtn').is_enabled())
   check(name+' never claims physical success',page.evaluate('RetroApp.clips.at(-1).printState==="not_connected"'))
  config(page,postRecordMode='both');scenario(page,'printed_confirmed');capture(page);state(page,'qr')
  check('both mode retains QR',page.evaluate('RetroApp.status.delivery.reason==="always_screen"'));leave(page)
  config(page,postRecordMode='smart');page.locator('#receiptMode').select_option('photo');page.locator('#settingsForm button[type=submit]').click();scenario(page,'printed_confirmed');capture(page);state(page,'qr')
  check('photo-only receipt never bypasses',page.evaluate('RetroApp.status.delivery.reason==="receipt_has_no_qr"'));leave(page)
  config(page,postRecordMode='screen');scenario(page,'timeout');capture(page);state(page,'qr')
  check('screen-only ignores print attempt',page.evaluate('RetroApp.status.delivery.reason==="screen_only"'))
 elif args.group=='timers':
  config(page,qrDisplaySeconds=5);page.locator('#returnSeconds').select_option('5');page.locator('#settingsForm button[type=submit]').click()
  capture(page);state(page,'qr');start=time.monotonic();id=page.evaluate('RetroApp.clips.at(-1).id')
  check('QR bound to saved recording',page.evaluate('(id)=>RetroApp.status.delivery.clipId===id&&RetroApp.clips.at(-1).deliverySnapshot.clipId===id',id))
  check('per-clip settings frozen',page.evaluate('RetroApp.clips.at(-1).settings.qrDisplaySeconds===5'))
  check('QR distinct from recording canvas',page.locator('#deliveryQrCanvas').evaluate('(e)=>e!==document.getElementById("cameraCanvas")'))
  page.evaluate('RetroApp.start("touch");RetroApp.go("admin")')
  check('cannot start or navigate during QR',page.evaluate('RetroApp.status.state==="qr"&&RetroApp.status.view==="booth"'))
  check('active settings mutation rejected',page.evaluate('async()=>{try{await RetroApp.saveDeliverySettings({qrDisplaySeconds:60});return false}catch{return true}}'))
  state(page,'idle',9000);elapsed=time.monotonic()-start
  check('no added five second thank-you delay',3.5<elapsed<8)
  check('QR pixels and labels cleared',page.evaluate('deliveryQrCanvas.width===1&&deliveryRef.textContent===""&&deliverySeconds.textContent===""&&!RetroApp.status.delivery.active'))
  capture(page);state(page,'qr');check('next guest unique QR',page.evaluate('RetroApp.status.delivery.clipId')!=id)
  page.evaluate('window.__qaHidden=true;Object.defineProperty(document,"hidden",{get:()=>__qaHidden,configurable:true});document.dispatchEvent(new Event("visibilitychange"))')
  check('hidden page hides QR',page.locator('#deliveryOverlay').is_hidden())
  page.wait_for_timeout(5200);page.evaluate('__qaHidden=false;document.dispatchEvent(new Event("visibilitychange"))');state(page,'idle')
  check('hidden time does not extend QR',page.locator('#deliveryOverlay').is_hidden() and page.locator('#touchBtn').is_enabled())
  capture(page);state(page,'qr');leave(page);check('pagehide is bfcache-safe',page.evaluate('!RetroApp.status.delivery.active&&deliveryQrCanvas.width===1'))
  capture(page);state(page,'qr');page.evaluate('window.dispatchEvent(new Event("retro-native-pause"))');state(page,'idle')
  check('native-pause clears QR',page.locator('#deliveryOverlay').is_hidden())
  (Q/'v06-deadline-measurement.json').write_text(json.dumps({'qrConfiguredSeconds':5,'observedWaitSeconds':elapsed,'extraThanksSetting':5,'scope':'Chromium demo, not Android throughput'},indent=2))
 elif args.group=='layout':
  config(page,qrDisplaySeconds=60);dimensions=[]
  for style in ['heritage','edge']:
   page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style);capture(page);state(page,'qr')
   for w,h in [(1920,1080),(1366,768),(1024,600),(800,360),(390,844),(320,720)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200);prefix=f'{style} {w}x{h}'
    check(prefix+' QR visible',page.locator('#deliveryOverlay').is_visible())
    check(prefix+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    check(prefix+' QR inside picture',page.locator('#deliveryQrCanvas').evaluate('e=>{const a=e.getBoundingClientRect(),b=document.getElementById("screen").getBoundingClientRect();return a.x>=b.x&&a.y>=b.y&&a.right<=b.right+1&&a.bottom<=b.bottom+1}'))
    check(prefix+' integral square scaling',page.locator('#deliveryQrCanvas').evaluate('e=>e.width===e.height&&Math.abs(e.getBoundingClientRect().width-e.width)<.01'))
    check(prefix+' no filter or mirror',page.locator('#deliveryQrCanvas').evaluate('e=>getComputedStyle(e).filter==="none"&&getComputedStyle(e).transform==="none"'))
    check(prefix+' no guest playback/stop',page.locator('#stopBtn').is_hidden() and not page.locator('#clipDialog').evaluate('e=>e.open'))
    dimensions.append({'style':style,'viewport':[w,h],'qr':page.locator('#deliveryQrCanvas').bounding_box()})
    if w in [1920,800,390,320]:page.screenshot(path=str(Q/f'v06-{style}-qr-{w}.png'))
    if w==1920:
     page.locator('#deliveryQrCanvas').screenshot(path=str(Q/f'v06-{style}-qr-symbol.png'));(Q/f'v06-{style}-qr-expected.txt').write_text(page.evaluate('RetroApp.clips.at(-1).deliverySnapshot.payload'))
   leave(page);page.set_viewport_size({'width':1920,'height':1080})
  page.evaluate('RetroApp.go("admin")')
  for w,h in [(1440,1000),(800,720),(390,844),(320,720)]:
   page.set_viewport_size({'width':w,'height':h});page.locator('#deliveryForm').scroll_into_view_if_needed();page.wait_for_timeout(200)
   check(str(w)+' admin controls visible',page.locator('#deliveryForm').is_visible());check(str(w)+' admin no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   if w in [1440,390]:page.screenshot(path=str(Q/f'v06-admin-{w}.png'))
  (Q/'v06-qr-geometries.json').write_text(json.dumps(dimensions,indent=2))
 elif args.group=='webcam-guard':
  config(page,receiptPrintEnabled=True);scenario(page,'printed_confirmed');page.locator('#cameraLabEnable').click();page.wait_for_function('RetroApp.status.mode==="real"')
  capture(page);state(page,'qr')
  check('synthetic webcam produces encoded clip',page.evaluate('RetroApp.clips.at(-1).kind==="real"&&RetroApp.clips.at(-1).sizeBytes>1000'))
  check('demo print result cannot bypass real capture',page.evaluate('RetroApp.status.delivery.route==="qr"&&!RetroApp.status.delivery.simulated&&RetroApp.status.delivery.reason==="not_connected"'))
  check('validation and effects retained',page.evaluate('RetroApp.clips.at(-1).validation.status==="metadata_readable"&&RetroApp.clips.at(-1).captureLook.key==="heritage"'))
  check('no fabricated print or cloud success',page.evaluate('RetroApp.clips.at(-1).uploadState==="not_configured"&&RetroApp.clips.at(-1).printState==="not_connected"'))
 check('no uncaught JS errors',not errors);check('no external HTTP requests',not [r for r in requests if r.startswith(('http:','https:'))])
 (Q/('v06-'+args.group+'.json')).write_text(json.dumps({'group':args.group,'passed':len(checks),'checks':checks,'errors':errors,'scope':'Opaque-origin Chromium; mock storage and synthetic media. Not hardware/real IDB/Android.'},indent=2))
 b.close()
print('TOTAL '+str(len(checks))+' PASSED',flush=True)
