"""v0.9.10 Android USB backup mock integration in real Chromium.
Synthetic BrowserStore/SAF provider; NOT physical Android/USB validation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os
R=Path(__file__).resolve().parents[1]
(R/'qa').mkdir(exist_ok=True)
html=(R/'dist/RetroBooth_Prototype.html').read_text(encoding='utf8')
checks=[];errors=[]
def check(title,pred):
 if not pred: raise AssertionError(title)
 checks.append(title);print('PASS',title,flush=True)
fixture=r'''
window.__aux={};
window.__sourceClip={id:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',seq:43,kind:'real',lifecycle:'active',createdAt:'2026-11-27T19:30:45Z',blob:new Blob(['SYNTHETIC_VIDEO_DATA_12345'],{type:'video/webm'}),mime:'video/webm',sizeBytes:26,sha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',validation:{status:'metadata_readable'},title:'ALEX & SAM',eventDate:'2026-12-20',durationMs:12000,moderation:'pending',guestPermission:'private',thumbnail:'',settings:{},simulation:{}};
BrowserStore.prototype.open=async function(){this.available=true;return true};
BrowserStore.prototype.getSettings=async()=>null;
BrowserStore.prototype.getAux=async k=>__aux[k];
BrowserStore.prototype.setAux=async (k,v)=>{__aux[k]=structuredClone(v);};
BrowserStore.prototype.getSequence=async()=>({next:44});
window.__otherClip={...__sourceClip,id:'cccccccccccccccccccccccccccccccc',title:'OTHER EVENT',seq:42};
BrowserStore.prototype.list=async()=>[__sourceClip,__otherClip];
BrowserStore.prototype.getClip=async()=>__sourceClip;
BrowserStore.prototype.setSettings=async()=>true;
let cfg={available:true,configured:false,enabled:false,ready:false,folderKey:'test-A',folderName:'Client Event'};
const jobs=new Map(),files=new Map();window.__usbMock={cfg,jobs,files,ops:[]};
window.RetroBackupNative={onmessage:null,postMessage(raw){
 const m=JSON.parse(raw);__usbMock.ops.push(m.op);let result={id:m.id};
 try{
  switch(m.op){
   case 'status': result={...result,...cfg};break;
   case 'select':Object.assign(cfg,{configured:true,enabled:true,ready:true});result={...result,...cfg};break;
   case 'pause':cfg.enabled=false;result={...result,...cfg};break;
   case 'enable':cfg.enabled=true;result={...result,...cfg};break;
   case 'forget':Object.assign(cfg,{configured:false,enabled:false,ready:false});result={...result,...cfg};break;
   case 'begin':{
     if(!cfg.ready||!cfg.enabled)throw Error('USB not available');
     if(files.has(m.name)){const f=files.get(m.name);if(f.size!==m.size||f.sha256!==m.sha256)throw Error('Invalid existing USB file');result={...result,alreadyVerified:true,verified:true,bytes:f.size};break;}
     jobs.set(m.id,{name:m.name,expected:m.size,sha256:m.sha256,received:0,index:0});break;
   }
   case 'chunk':{
     const j=jobs.get(m.id);if(!j||j.index!==m.index)throw Error('Out of order');
     if(!cfg.ready)throw Error('USB unplugged');j.received+=atob(m.base64).length;j.index++;result.bytes=j.received;break;
   }
   case 'finish':{
     const j=jobs.get(m.id);if(!j||j.received!==j.expected)throw Error('Copy incomplete');
     files.set(j.name,{size:j.received,sha256:j.sha256});jobs.delete(m.id);
     result={...result,bytes:j.received,verified:true,name:j.name};break;
   }
   case 'verify':{const file=files.get(m.name);if(!file||file.size!==m.size||file.sha256!==m.sha256)throw Error('USB mismatch');result={...result,bytes:file.size,verified:true};break;}
   case 'abort':jobs.delete(m.id);result.aborted=true;break;
   default:throw Error('Unknown operation '+m.op);
  }
 }catch(e){result.error=e.message;}
 setTimeout(()=>this.onmessage?.({data:JSON.stringify(result)}),5);
}};
'''
# Inject mocks after BrowserStore is declared but before application startup.
assert html.count('(async function () {')==1
html=html.replace('(async function () {',fixture+'\n(async function () {',1)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html)
 page.wait_for_function('window.RetroApp?.status.ready',timeout=25000)
 page.evaluate('RetroApp.go("admin")')
 check('Admin section 09 visible',page.locator('#usbBackupCard').is_visible())
 check('Previous event clips not eligible before choosing USB',page.locator('#usbBackupVerified').inner_text()=='0 / 0')
 check('No chosen USB folder', 'NOT CONFIGURED' in page.locator('#usbBackupStatus').inner_text())
 check('Copy pending disabled until folder selected',page.locator('#usbBackupCopy').is_disabled())
 page.locator('#usbBackupChoose').click()
 page.wait_for_function("document.querySelector('#usbBackupFolder').textContent.includes('Client Event')",timeout=12000)
 check('New USB does not copy preexisting videos by default',page.locator('#usbBackupVerified').inner_text()=='0 / 0')
 check('Admin explains excluded prior videos','2 other local clip(s) excluded' in page.locator('#usbBackupScope').inner_text())
 check('No automatic begin for an old clip',not page.evaluate("__usbMock.ops.includes('begin')"))
 check('Manual copy requires explicit backfill approval',page.locator('#usbBackupCopy').is_disabled())
 page.locator('#usbBackupSince').fill('2026-11-27T19:00')
 page.locator('#usbBackupApplyScope').click()
 page.wait_for_function("document.querySelector('#usbBackupVerified').textContent==='1 / 1'",timeout=14000)
 check('Staff-confirmed event start includes matching earlier clip','1 / 1' in page.locator('#usbBackupVerified').inner_text())
 check('Other client event still excluded from USB',page.evaluate('__usbMock.files.size===1'))
 check('Scoped backup boundary saved in IndexedDB',page.evaluate("__aux['usb-backup-scope-v1']?.eventTitle==='ALEX & SAM'"))
 check('Bridge sent begin/chunk/finish',page.evaluate("['begin','chunk','finish'].every(op=>__usbMock.ops.includes(op))"))
 check('IndexedDB original not deleted or changed by USB transfer',page.evaluate('__sourceClip.blob.size===26 && __sourceClip.lifecycle==="active"'))
 check('SHA-256-verified state persisted in store auxiliary ledger',page.evaluate("Object.values(__aux['usb-backup-ledger-v1']||{}).some(v=>v.status==='verified')"))
 page.locator('#usbBackupVerify').click()
 page.wait_for_function("document.querySelector('#usbBackupRecent').textContent.includes('ALL SHA-256 OK')",timeout=12000)
 check('Verify all action explicitly checks existing files',page.evaluate("__usbMock.ops.includes('verify')"))
 page.locator('#usbBackupToggle').click()
 page.wait_for_function("document.querySelector('#usbBackupStatus').textContent.includes('PAUSED')",timeout=9000)
 check('Pausing auto backup retains destination','Client Event' in page.locator('#usbBackupFolder').inner_text())
 check('No JavaScript page errors',not errors)
 for width,height in [(1920,1080),(1280,720),(770,360)]:
  page.set_viewport_size({'width':width,'height':height})
  check(f'USB Admin {width}x{height} fits page width',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  if width==1280:page.locator('#usbBackupCard').screenshot(path=str(R/'qa/v010-usb-admin-card.png'))
 page.close()
 # Browser/Windows version must never imply that automated native writes are available.
 second=browser.new_page(viewport={'width':1280,'height':720});second.on('pageerror',lambda e:errors.append(str(e)))
 second.set_content((R/'dist/RetroBooth_Prototype.html').read_text())
 second.wait_for_function('window.RetroApp?.status.ready');second.evaluate('RetroApp.go("admin")')
 check('Ordinary browser shows unsupported status','ANDROID APP ONLY' in second.locator('#usbBackupStatus').inner_text())
 check('Ordinary browser has no active destination picker',second.locator('#usbBackupChoose').is_disabled())
 check('No JavaScript errors in fallback mode',not errors)
 second.close()
 # Deterministic synthetic fresh clip timestamp after folder selection: only current-event
 # new recordings can enter the automatic queue; previous-event clips never can.
 fresh_html=html.replace("createdAt:'2026-11-27T19:30:45Z'",'createdAt:new Date(Date.now()+5000).toISOString()',1)
 fresh=browser.new_page(viewport={'width':1280,'height':720});fresh.on('pageerror',lambda e:errors.append(str(e)))
 fresh.set_content(fresh_html);fresh.wait_for_function('window.RetroApp?.status.ready',timeout=25000)
 fresh.evaluate('RetroApp.go("admin")');fresh.locator('#usbBackupChoose').click()
 fresh.wait_for_function("document.querySelector('#usbBackupVerified').textContent==='1 / 1'",timeout=14000)
 check('New current-event recording automatically backed up after USB scope begins',fresh.locator('#usbBackupVerified').inner_text()=='1 / 1')
 check('New-event auto copy uses SHA-256-verified native finish',fresh.evaluate("['begin','chunk','finish'].every(op=>__usbMock.ops.includes(op))"))
 check('New-event auto copy still excludes other clients',fresh.evaluate('__usbMock.files.size===1'))
 check('No JavaScript page errors in fresh-event flow',not errors)
 fresh.close()
 browser.close()
print(f'TOTAL {len(checks)} PASSED',flush=True)
