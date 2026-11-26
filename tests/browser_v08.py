"""Legacy v0.8 flows revalidated against the v0.9.6 PHOTO+QR native contract;
This is not Android execution, Bluetooth transport or paper output validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,re,json,os,hashlib,time,base64
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--group',choices=['printer-ui','native-flow','deadline-manual'],required=True);args=a.parse_args();checks=[];errors=[]
def check(s,v):
 if not v:raise AssertionError(s)
 checks.append(s);print('PASS '+s,flush=True)
def state(p,s,timeout=25000):
 try:p.wait_for_function('(s)=>RetroApp.status.state===s',arg=s,timeout=timeout)
 except Exception:print(p.evaluate('({status:RetroApp.status,error:errorText.textContent})'));raise
base=re.search(r"fixture=r'''([\s\S]*?)'''",(R/'tests/browser_v05.py').read_text()).group(1).replace('countdown:0,returnSeconds:1,osd:false','countdown:0,returnSeconds:0,osd:false,qrDisplaySeconds:5')
cloud=re.search(r"fixture\+=r'''([\s\S]*?)'''",(R/'tests/browser_v07.py').read_text()).group(1)
native=r'''
// MOCK BRIDGE: no Android code or physical bytes execute in this fixture.
window.__np={calls:[],jobs:[],state:'sent_unconfirmed',fast:false,delay:0,badHash:false,duplicate:false,connected:false,automaticEnabled:false,pinned:'',revoked:[]};
const mockStatus=()=>({available:true,supported:true,connected:__np.connected,automaticEnabled:__np.automaticEnabled,pinned:__np.pinned,permission:true,busy:false,fastReturnArmed:__np.fast,paperStatus:'unavailable'});
window.RetroPrinterNative={postMessage:async raw=>{const m=JSON.parse(raw);__np.calls.push({...m,boothState:window.RetroApp?.status.state,saved:__fx.clips.length});let d=mockStatus(),error=null;
 if(m.op==='list')d.devices=[{address:'AA:BB:CC:DD:EE:FF',name:'MOCK SPP PRINTER - NOT HARDWARE'}];
 else if(m.op==='pin')__np.pinned=m.address;
 else if(m.op==='connect')__np.connected=true;
 else if(m.op==='automatic')__np.automaticEnabled=m.enabled;
 else if(m.op==='fastOff')__np.fast=false;
 else if(m.op==='observe'){const job=__np.jobs.find(j=>j.id===m.jobId);if(!job||job.payload!==m.scanned)error='Scan mismatch in MOCK fixture';else __np.fast=true;}
 else if(m.op==='ledger')d.jobs=__np.jobs.map(({payload,...j})=>j);
 else if(m.op==='revoke')__np.revoked.push(m.clipId);
 else if(m.op==='disconnect'||m.op==='cancel'){__np.connected=false;__np.automaticEnabled=false;__np.fast=false;}
 else if(m.op==='print'){
  if(!__np.connected||m.automatic&&!__np.automaticEnabled)error='Printer disconnected or automatic permission off.';
  else{const old=__np.jobs.find(j=>j.id===m.jobId);const dup=!!old||__np.duplicate;
   if(!old)__np.jobs.push({id:m.jobId,clip:m.clipId,state:__np.state,label:m.label,kind:'guest',created:Date.now(),parent:m.parent,payload:m.payload});
   d={jobId:m.jobId,clipId:m.clipId,urlHash:__np.badHash?'bad':await RetroPrinter.hash(m.payload),state:__np.state,duplicate:dup,transport:'android_secure_spp',simulated:false,paperConfirmed:false,photoIncluded:!!m.photoBase64,fastReturnEligible:__np.fast&&!dup,status:mockStatus()};
  }
 }
 if(m.op==='print'&&__np.delay)await new Promise(r=>setTimeout(r,__np.delay));
 setTimeout(()=>RetroPrinterNative.onmessage?.({data:JSON.stringify({id:m.id,version:1,data:d,error})}),10);
}};
'''
def ready_print(p):
 p.evaluate('RetroApp.go("admin")');p.locator('#printerList').click();p.wait_for_function('printerDevice.options.length===2');p.locator('#printerDevice').select_option('AA:BB:CC:DD:EE:FF');p.locator('#printerPin').click();p.wait_for_function('__np.pinned!==""');p.wait_for_function('!printerConnect.disabled');p.locator('#printerConnect').click();p.wait_for_function('printerStatus.textContent.startsWith("CONNECTED")');p.locator('#printerEnableAuto').click();p.wait_for_function('printerStatus.textContent.includes("automatic ON")')
def capture(p,full=False):
 p.evaluate('RetroApp.go("booth")');p.locator('#touchBtn').click();state(p,'recording')
 if not full:p.wait_for_timeout(2150);p.evaluate('RetroApp.stop()')
def leave(p):p.evaluate('window.dispatchEvent(new Event("pagehide"))');state(p,'idle')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox']);p=b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(15000);p.on('pageerror',lambda e:errors.append(str(e)))
 p.expose_function('__sha',lambda text:hashlib.sha256(base64.b64decode(text)).hexdigest())
 fixture=base+cloud+(native if args.group!='printer-ui' else '')
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 p.set_content(html);p.wait_for_function('window.RetroApp?.status.ready');p.evaluate('RetroApp.go("admin")');p.wait_for_timeout(100)
 if args.group=='printer-ui':
  check('browser truthfully reports native APK required','no native Bluetooth bridge' in p.locator('#printerStatus').inner_text())
  for id in ['printerConnect','printerManual','printerReprint','printerTest','printerObserve','printerPin']:check(id+' disabled without native',p.locator('#'+id).is_disabled())
  check('photo + QR pilot is described honestly','384-dot monochrome guest snapshot' in p.locator('#printerCard').inner_text() and 'No cutter' in p.locator('#printerCard').inner_text())
  check('paper status warning visible','paper sensor' in p.locator('#printerCard').inner_text())
  for w,h in [(1920,1080),(1440,1000),(800,720),(390,844),(320,720)]:
   p.set_viewport_size({'width':w,'height':h});p.locator('#printerCard').scroll_into_view_if_needed();p.wait_for_timeout(100)
   check(str(w)+' no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(str(w)+' printer card visible',p.locator('#printerCard').is_visible())
   if w in [1440,390]:p.screenshot(path=str(Q/f'v08-printer-browser-{w}.png'))
  p.locator('#printerAdvanced').evaluate('e=>e.open=true');p.locator('#printerAdvanced').scroll_into_view_if_needed();check('scan entry masked',p.locator('#printerScanned').get_attribute('type')=='password');p.screenshot(path=str(Q/'v08-printer-risk-browser.png'))
 else:
  p.locator('#cloudBundle').fill(p.evaluate('JSON.stringify(__bundle)'));p.locator('#cloudConnect').click();p.wait_for_function('cloudStatus.textContent.includes("12 reserved")')
  p.evaluate('RetroApp.saveDeliverySettings({receiptPrintEnabled:true,postRecordMode:"smart",printWaitSeconds:2})')
  ready_print(p);check('selected printer pinned',p.evaluate('__np.pinned==="AA:BB:CC:DD:EE:FF"'))
  check('fast return OFF by default','fast return OFF' in p.locator('#printerStatus').inner_text())
  p.locator('#cameraLabEnable').click();p.wait_for_function('RetroApp.status.mode==="real"');
  if args.group=='native-flow':
   capture(p,full=True);state(p,'qr',40000)
   check('native receives only after local commit',p.evaluate('__np.calls.filter(c=>c.op==="print").every(c=>c.saved>0&&c.boothState==="receipt")'))
   check('native payload is EXACT saved QR',p.evaluate('__np.calls.find(c=>c.op==="print").payload===__fx.clips[0].deliverySnapshot.payload'))
   check('default unconfirmed send retains screen QR',p.evaluate('RetroApp.status.delivery.route==="qr"&&RetroApp.clips[0].printTicket.paperConfirmed===false'))
   check('native screen reason is not fake simulation','simulation' not in p.locator('#deliveryReason').inner_text().lower())
   check('automatic job ID equals local clip ID',p.evaluate('__np.calls.find(c=>c.op==="print").jobId===__fx.clips[0].id'))
   p.set_viewport_size({'width':1920,'height':1080});p.screenshot(path=str(Q/'v08-native-simulated-fallback.png'));leave(p)
   p.evaluate('__np.fast=true');capture(p);state(p,'idle')
   check('explicit fast return acceptance is transport success, never confirmed paper',p.evaluate('RetroApp.clips.at(-1).printTicket.paperConfirmed===false'))
   check('fast result never records printed-confirmed',p.evaluate('RetroApp.clips.at(-1).printState==="sent_unconfirmed"'))
   p.evaluate('RetroApp.go("admin");RetroApp.saveDeliverySettings({postRecordMode:"both"})');capture(p);state(p,'qr');check('always-screen overrides accepted native send',p.evaluate('RetroApp.status.delivery.reason==="always_screen"'));leave(p)
   p.evaluate('RetroApp.go("admin");RetroApp.saveDeliverySettings({postRecordMode:"smart"});__np.duplicate=true');capture(p);state(p,'qr');check('duplicate acknowledgement cannot hide QR',p.evaluate('RetroApp.status.delivery.route==="qr"'));leave(p)
   p.evaluate('__np.duplicate=false;__np.badHash=true');capture(p);state(p,'qr');check('wrong native payload hash fails closed',p.evaluate('RetroApp.status.delivery.route==="qr"'));leave(p)
   p.evaluate('__np.badHash=false;__np.state="outcome_unknown"');capture(p);state(p,'qr');check('unknown native outcome retains QR',p.evaluate('RetroApp.status.delivery.reason==="outcome_unknown"'));leave(p)
   p.evaluate('RetroApp.go("admin")');p.locator('#printerCard').scroll_into_view_if_needed();p.wait_for_timeout(200);p.screenshot(path=str(Q/'v08-printer-mock-native-1920.png'))
  else:
   p.evaluate('__np.delay=4000');capture(p);state(p,'qr');check('deadline returns to QR without indefinite blocking',p.evaluate('RetroApp.status.delivery.route==="qr"'));cid=p.evaluate('RetroApp.clips.at(-1).id');p.wait_for_timeout(2400)
   check('timeout cancellation is request-bound',p.evaluate('__np.calls.some(c=>c.op==="cancel"&&c.requestId)'))
   check('late success cannot hide current QR',p.evaluate('(id)=>RetroApp.status.state==="qr"&&RetroApp.status.delivery.clipId===id',cid));leave(p)
   p.evaluate('__np.delay=0');ready_print(p)
   capture(p);state(p,'qr');leave(p);p.evaluate('RetroApp.go("admin")');p.locator('#printerClipRefresh').click();p.locator('#printerClip').select_option(cid)
   before=p.evaluate('__np.calls.filter(c=>c.op==="print").length');p.locator('#printerManual').click();p.wait_for_function('(n)=>__np.calls.filter(c=>c.op==="print").length>n',arg=before);p.wait_for_function('!printerManual.disabled')
   check('history print uses selected older recording not newest',p.evaluate('(id)=>__np.calls.filter(c=>c.op==="print").at(-1).clipId===id',cid))
   check('repeat print once reports duplicate, no automatic resend','duplicate suppressed' in p.locator('#printerNotice').inner_text())
   p.locator('#printerReprint').click();p.wait_for_function('!printerReprint.disabled');p.wait_for_timeout(100)
   check('explicit reprint new ID with same parent and URL',p.evaluate('(id)=>{const a=__np.calls.filter(c=>c.op==="print").at(-1),orig=__fx.clips.find(c=>c.id===id);return a.parent===id&&a.jobId!==id&&a.payload===orig.deliverySnapshot.payload}',cid))
   p.locator('#printerAdvanced').evaluate('e=>e.open=true');p.locator('#printerScanned').fill(p.evaluate('(id)=>__fx.clips.find(c=>c.id===id).deliverySnapshot.payload',cid));p.locator('#printerObserve').click();p.wait_for_function('!printerObserve.disabled')
   check('scan value cleared after observation',p.locator('#printerScanned').input_value()=='')
   check('mock acceptance reflected in status','OPERATOR RISK ACCEPTED' in p.locator('#printerStatus').inner_text())
   p.locator('#printerFastOff').click();p.wait_for_function('!printerFastOff.disabled');check('explicit safe default restored','fast return OFF' in p.locator('#printerStatus').inner_text())
   p.evaluate('window.dispatchEvent(new Event("retro-native-pause"))');check('pause clears UI fast acceptance','fast return OFF' in p.locator('#printerStatus').inner_text())
 check('no uncaught JavaScript errors',not errors)
 (Q/('v08-'+args.group+'.json')).write_text(json.dumps({'group':args.group,'passed':len(checks),'checks':checks,'errors':errors,'scope':'MOCK native bridge + mocked IDB/cloud, synthetic A/V; not Android or paper'},indent=2))
 b.close()
print('TOTAL '+str(len(checks))+' PASSED')
