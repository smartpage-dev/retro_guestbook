"""Receipt 04 native test path and 4:3 / 16:9 raster; Chromium mock Bluetooth only.
Not Android build, SPP paper, printer scan or Bluetooth validation.
"""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];(R/'qa').mkdir(exist_ok=True)
fixture=(R/'tests/browser_v05.py').read_text().split("fixture=r'''",1)[1].split("'''",1)[0]
fixture+='''
window.__nativeCalls=[];
window.RetroPrinterNative={postMessage(raw){
 const m=JSON.parse(raw);window.__nativeCalls.push(m);
 const info=m.op==='test'?{jobId:'a'.repeat(32),clipId:'a'.repeat(32),state:'sent_unconfirmed',bytes:22000,simulated:false,paperConfirmed:false,photoIncluded:!!m.photoBase64}:{available:true,connected:true,devices:[],jobs:[],pinned:'AA:BB',automaticEnabled:false,fastReturnArmed:false};
 setTimeout(()=>this.onmessage?.({data:JSON.stringify({id:m.id,version:1,data:info})}),2);
}};
'''
checks=[]
def check(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1280,'height':860},accept_downloads=True)
 page=ctx.new_page();page.set_default_timeout(16000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
 page.evaluate('RetroApp.go("admin")');page.wait_for_function("!document.querySelector('#receiptTestPrint').disabled")
 check('04 receipt includes direct native test button',page.locator('#receiptTestPrint').count()==1)
 check('04 receipt includes QR-only diagnostic',page.locator('#receiptTestQR').count()==1)
 check('ratio defaults to 4:3',page.locator('#ticketPhotoAspect').input_value()=='4:3')
 check('countdown screenshot still defaults to T-2',page.locator('#ticketCaptureSecond').input_value()=='2')
 initial_height=page.locator('#designCanvas').evaluate('(c)=>c.height')
 check('demo camera is off before first print',page.evaluate('RetroApp.status.mode==="demo"'))
 page.locator('#receiptCaption').fill('Testing caption')
 page.locator('#receiptFooter').fill('Thank you guests')
 page.locator('#receiptTestPrint').click()
 page.wait_for_function('__nativeCalls.some(c=>c.op==="test"&&c.photoBase64)')
 job=page.evaluate('''()=>{const c=__nativeCalls.find(x=>x.op==='test'&&x.photoBase64);return {width:c.photoWidth,height:c.photoHeight,encoding:c.photoEncoding,moment:c.photoMoment,bytes:atob(c.photoBase64).length,caption:c.ticketCaption,footer:c.ticketFooter,title:c.ticketTitle,style:c.ticketStyle,payload:c.payload||null}}''')
 check('off-camera test is explicit SAMPLE, not LIVE',job['moment']=='TEST SAMPLE')
 check('4:3 is 384x288 physical 1bpp',job['width']==384 and job['height']==288 and job['bytes']==384*288//8 and job['encoding']=='escpos-gsv0-384x288-1bpp-v2')
 check('unsaved caption/footer included in native ticket',job['caption']=='Testing caption' and job['footer']=='Thank you guests')
 check('demo QR test never sends guest payload',job['payload'] is None)
 page.wait_for_function("document.querySelector('#receiptTestNotice').textContent.includes('paper unconfirmed')")
 check('paper status reported unconfirmed, not printed',page.locator('#receiptTestNotice').inner_text().lower().find('paper unconfirmed')>=0)
 page.locator('#receiptTestQR').click();page.wait_for_function('__nativeCalls.filter(c=>c.op==="test").length>=2')
 check('04 QR-only test has zero photo bytes',page.evaluate('!__nativeCalls.filter(c=>c.op==="test")[1].photoBase64'))
 page.locator('#ticketPhotoAspect').select_option('16:9')
 page.wait_for_function('(h)=>document.querySelector("#designCanvas").height===h-72',arg=initial_height)
 check('16:9 design preview photo becomes 72 dots shorter',page.locator('#designCanvas').evaluate('(c)=>c.height')==initial_height-72)
 check('unsaved ratio does not mutate active event',page.evaluate('RetroApp.status.settings.ticketPhotoAspect==="4:3"'))
 page.locator('#receiptTestPrint').click();page.wait_for_function('__nativeCalls.filter(c=>c.op==="test"&&c.photoBase64).length>=2')
 job2=page.evaluate('''()=>{const c=__nativeCalls.filter(x=>x.op==='test'&&x.photoBase64).at(-1);return {w:c.photoWidth,h:c.photoHeight,encoding:c.photoEncoding,bytes:atob(c.photoBase64).length,moment:c.photoMoment}}''')
 check('16:9 real raster 384x216 dots',job2=={'w':384,'h':216,'encoding':'escpos-gsv0-384x216-1bpp-v2','bytes':384*216//8,'moment':'TEST SAMPLE'})
 page.locator('#settingsForm button[type=submit]').click()
 page.wait_for_function('RetroApp.status.settings.ticketPhotoAspect==="16:9"')
 check('16:9 ratio saved as event setting',page.evaluate('RetroApp.status.settings.ticketPhotoAspect==="16:9"'))
 page.locator('#applyCameraOnly').click();page.wait_for_function('RetroApp.status.mode==="preview"')
 page.locator('#receiptTestPrint').click();page.wait_for_function('__nativeCalls.filter(c=>c.op==="test"&&c.photoMoment==="TEST LIVE").length>0')
 check('live camera test uses TEST LIVE marker',page.evaluate('__nativeCalls.some(c=>c.photoMoment==="TEST LIVE")'))
 page.locator('#ticketPhotoAspect').select_option('4:3')
 page.locator('#receiptMode').select_option('qr')
 page.locator('#receiptTestPrint').click();page.wait_for_function('__nativeCalls.filter(c=>c.op==="test").length>=5')
 check('QR-only event receipt suppresses photo raster in test',page.evaluate('__nativeCalls.filter(c=>c.op==="test").at(-1).photoBase64===undefined'))
 page.locator('#receiptMode').select_option('both')
 page.locator('#ticketPhotoAspect').select_option('4:3')
 page.locator('#receiptTestPrint').scroll_into_view_if_needed()
 page.locator('.receipt-test-panel').screenshot(path=str(R/'qa/v096-receipt-test-panel.png'))
 page.locator('.designer').screenshot(path=str(R/'qa/v096-receipt-designer-43.png'))
 page.locator('#ticketPhotoAspect').select_option('16:9')
 page.locator('.designer').screenshot(path=str(R/'qa/v096-receipt-designer-169.png'))
 page.set_viewport_size({'width':770,'height':360});page.locator('#receiptTestPrint').scroll_into_view_if_needed();page.wait_for_timeout(200)
 check('direct print button visible on 32-inch kiosk scaled admin',page.locator('#receiptTestPrint').is_visible())
 check('no javascript errors',not errors)
 (R/'qa/v096-receipt-printer-browser.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors,'scope':'Chromium synthetic camera and mocked native printer; no Android hardware or physical paper'},indent=2)+'\n')
 browser.close()
print('TOTAL',len(checks),'PASSED',flush=True)
