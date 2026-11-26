"""Browser/fixture acceptance for the v0.9.5 countdown still and printer image envelope.
Not actual Android, ESC/POS hardware, paper, or cloud acceptance.
"""
from pathlib import Path
import json, os, base64
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
fixture=(R/'tests/browser_v05.py').read_text().split("fixture=r'''",1)[1].split("'''",1)[0]
fixture+='''
window.__fx.settings=RetroCore.safeSettings({countdown:3,osd:false,returnSeconds:1,receipt:'both',ticketCaptureSecond:2});
window.__nativeCalls=[];
window.RetroPrinterNative={postMessage(raw){
 const m=JSON.parse(raw);window.__nativeCalls.push(m);
 const info=m.op==='test'?{jobId:'a'.repeat(32),clipId:'a'.repeat(32),state:'sent_unconfirmed',bytes:16384,simulated:false,paperConfirmed:false,photoIncluded:!!m.photoBase64}:{available:true,connected:true,devices:[],jobs:[],pinned:'AA:BB',automaticEnabled:false,fastReturnArmed:false};
 setTimeout(()=>this.onmessage?.({data:JSON.stringify({id:m.id,version:1,data:info})}),2);
}};
'''
checks=[]
def check(label,ok):
 if not ok:raise AssertionError(label)
 checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1280,'height':800},accept_downloads=True)
 page=ctx.new_page();page.set_default_timeout(20000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
 page.evaluate('RetroApp.go("admin")')
 check('Admin ticket photo moment has T-2 default',page.locator('#ticketCaptureSecond').input_value()=='2')
 check('Android photo + QR test command available',page.locator('#printerTestPhoto').count()==1)
 page.locator('#printerCard').screenshot(path=str(R/'qa/v095-android-printer-admin.png'))
 page.locator('#applyCameraOnly').click()
 page.wait_for_function('RetroApp.status.mode==="preview"')
 page.wait_for_timeout(250)
 page.locator('#printerTestPhoto').click()
 page.wait_for_function('__nativeCalls.some(m=>m.op==="test"&&m.photoBase64)',timeout=14000)
 job=page.evaluate('''()=>{
  const x=__nativeCalls.find(m=>m.op==='test'&&m.photoBase64);
  const bin=atob(x.photoBase64);let ink=0;
  for(let i=0;i<bin.length;i++){let n=bin.charCodeAt(i);for(let b=0;b<8;b++)ink+=(n>>b)&1;}
  return {width:x.photoWidth,height:x.photoHeight,encoding:x.photoEncoding,moment:x.photoMoment,bytes:bin.length,ink};
 }''')
 check('Test sends EXACT 384x336 1bpp raster',job['width']==384 and job['height']==336 and job['bytes']==16128 and job['encoding']=='escpos-gsv0-384x336-1bpp-v1')
 check('Test still is current LIVE camera frame, not all blank',0<job['ink']<job['width']*job['height'])
 check('Test ticket distinguishes live probe snapshot',job['moment']=='TEST LIVE')
 page.locator('#applyMicOnly').click();page.wait_for_function('RetroApp.status.mode==="real"')
 page.evaluate('RetroApp.go("booth")')
 page.locator('#touchBtn').click()
 page.wait_for_function('RetroApp.status.state==="recording"',timeout=12000)
 page.wait_for_function('RetroApp.status.clipCount===1',timeout=28000)
 clip=page.evaluate('''()=>{const c=__fx.clips.at(-1);return {kind:c.kind,moment:c.ticketPhotoMoment,photo:c.ticketSnapshot?.slice(0,24),len:c.ticketSnapshot?.length,raw:c.rawSnapshot?.slice(0,24)};}''')
 check('real clip stores the unique T-2 photo',clip['kind']=='real' and clip['moment']=='T-2' and clip['photo'].startswith('data:image/jpeg;base64,') and clip['len']>1000)
 check('saved clip includes independent recording still',clip['raw'].startswith('data:image/jpeg;base64,'))
 check('QA getter does not expose private photo as data URL',page.evaluate('RetroApp.clips.every(c=>!("ticketSnapshot" in c))'))
 page.wait_for_function('RetroApp.status.state==="idle"',timeout=24000)
 page.evaluate('RetroApp.go("admin")')
 page.locator('#ticketCaptureSecond').select_option('1')
 page.locator('#settingsForm button[type=submit]').click();page.wait_for_timeout(300)
 check('Admin T-1 selection persists to settings',page.evaluate('RetroApp.status.settings.ticketCaptureSecond===1'))
 page.locator('#ticketCaptureSecond').select_option('3')
 page.locator('#settingsForm button[type=submit]').click();page.wait_for_timeout(300)
 check('Admin T-3 selection persists to settings',page.evaluate('RetroApp.status.settings.ticketCaptureSecond===3'))
 check('App has zero browser JS errors',not errors)
 (R/'qa/v095-photo-ticket-browser.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors,'scope':'Chromium with synthetic camera/mic + simulated native printer reply; real Android/physical paper not tested'},indent=2)+'\n')
 browser.close()
print('TOTAL',len(checks),'PASSED',flush=True)
