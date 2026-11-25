"""Synthetic Android camera selection/probe regressions; NOT hardware validation."""
from pathlib import Path
import os,re,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
old=(R/'tests/browser_v05.py').read_text()
fixture=old.split("fixture=r'''",1)[1].split("'''",1)[0]
checks=[]
def check(label,cond):
 if not cond:raise AssertionError(label)
 checks.append(label);print('PASS',label,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready');page.evaluate('RetroApp.go("admin")')
 check('independent camera probe exists',page.locator('#testCameraOnly').count()==1)
 check('independent microphone probe exists',page.locator('#testMicOnly').count()==1)
 check('direction options front/rear/default',page.locator('#cameraDirection option').count()==3)
 page.locator('#cameraDirection').select_option('environment')
 page.locator('#testCameraOnly').click();page.wait_for_function("document.querySelector('#mediaDeviceStatus').textContent.includes('PASSED')")
 check('camera-only request disables audio',page.evaluate('__fx.constraints.at(-1).audio===false'))
 check('camera-only uses rear preference',page.evaluate('__fx.constraints.at(-1).video.facingMode.ideal==="environment"'))
 check('probe releases media tracks',page.evaluate('__fx.streams.at(-1).stream.getTracks().every(t=>t.readyState==="ended")'))
 page.locator('#testMicOnly').click();page.wait_for_function("document.querySelector('#mediaDeviceStatus').textContent.includes('PASSED')")
 check('mic-only request disables video',page.evaluate('__fx.constraints.at(-1).video===false'))
 check('mic-only releases tracks',page.evaluate('__fx.streams.at(-1).stream.getTracks().every(t=>t.readyState==="ended")'))
 page.locator('#deviceRefresh').click();page.wait_for_timeout(150)
 check('available camera choice listed',page.locator('#cameraSelect option').count()==2)
 check('available microphone choice listed',page.locator('#micSelect option').count()==2)
 # One-time Android basic-constraints retry on default selection only.
 page.evaluate('''()=>{const orig=navigator.mediaDevices.getUserMedia;let first=true;navigator.mediaDevices.getUserMedia=async c=>{if(first){first=false;__fx.constraints.push(c);throw new DOMException('busy','NotReadableError');}return orig(c);};}''')
 page.locator('#applyDevices').click();page.wait_for_function('RetroApp.status.mode==="real"')
 check('basic CAMERA fallback uses audio:false',page.evaluate('''()=>{const c=__fx.constraints.at(-2);return c.video.facingMode.ideal==='environment'&&c.audio===false}'''))
 check('successful separate inputs show LIVE', 'MICROPHONE LIVE' in page.locator('#mediaDeviceStatus').inner_text())
 page.locator('#cameraLabStop').click();page.wait_for_function('RetroApp.status.mode==="demo"')
 page.locator('#cameraSelect').select_option('fixture-camera');page.locator('#micSelect').select_option('fixture-mic')
 page.evaluate('''()=>{window.__selectedBefore=__fx.constraints.length;navigator.mediaDevices.getUserMedia=async c=>{__fx.constraints.push(c);throw new DOMException('busy','NotReadableError');};}''')
 page.locator('#applyDevices').click();page.wait_for_timeout(200)
 check('explicit device failures do not silently retry',page.evaluate('__fx.constraints.length===__selectedBefore+2'))
 check('explicit device failure does not activate recording',page.evaluate('RetroApp.status.mode==="demo"'))
 check('error status is actionable', 'MICROPHONE FAILED' in page.locator('#mediaDeviceStatus').inner_text())
 check('mobile admin has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 check('no browser JavaScript errors',not errors)
 print('TOTAL',len(checks),'PASSED',flush=True)
 (R/'qa/camera-hotfix-probes.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'scope':'Synthetic getUserMedia; no real Android/WebView hardware or permissions.'},indent=2)+'\n')
 browser.close()
