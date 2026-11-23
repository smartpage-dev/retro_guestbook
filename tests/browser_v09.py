"""Desktop controller tests using an explicit MOCK Electron bridge, not an EXE."""
from pathlib import Path
import re, json, os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]; Q=R/'qa'; Q.mkdir(exist_ok=True)
fixture=re.search(r"fixture=r'''([\s\S]*?)'''",(R/'tests/browser_v05.py').read_text()).group(1)
fixture+=r'''
window.__desktop={cloud:[],fullscreen:0,storage:0,fail:false};
window.RetroDesktop={version:'0.9.0-alpha.1',info:async()=>({version:'0.9.0-alpha.1',arch:'x64',origin:'retrobooth://app',cloudOrigin:''}),authorizeCloud:async origin=>{__desktop.cloud.push(origin);if(__desktop.fail)throw new Error('Native approval refused in MOCK');},fullscreen:async()=>{__desktop.fullscreen++;},storageLocation:async()=>{__desktop.storage++;},onSuspend:fn=>__desktop.suspend=fn,onExport:fn=>__desktop.export=fn};
'''
checks=[];errors=[]
def check(name,value):
 if not value: raise AssertionError(name)
 checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(12000);p.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 p.set_content(html);p.wait_for_function('window.RetroApp?.status.ready');p.evaluate('RetroApp.go("admin")');p.wait_for_timeout(100)
 check('Desktop panel visible only with explicit bridge',p.locator('#desktopCard').is_visible())
 check('Desktop platform/version rendered', 'x64 / app 0.9.0-alpha.1' in p.locator('#desktopInfo').inner_text())
 check('Windows printer unavailability is explicit','Windows desktop' in p.locator('#printerStatus').inner_text())
 check('Native printer stays disabled',p.locator('#printerConnect').is_disabled())
 p.locator('#desktopFullscreen').click();p.wait_for_function('__desktop.fullscreen===1');check('Fullscreen uses narrow native method',True)
 p.locator('#desktopStorage').click();p.wait_for_function('__desktop.storage===1');check('Storage action uses narrow native method',True)
 check('Moving EXE does not claim to move recordings','Moving the EXE does not move recordings' in p.locator('#desktopCard').inner_text())
 check('Precise cloud allowlist shown','retrobooth://app' in p.locator('#desktopCard').inner_text())
 for w,h in [(1440,1000),(800,720),(390,844),(320,720)]:
  p.set_viewport_size({'width':w,'height':h});p.locator('#desktopCard').scroll_into_view_if_needed();p.wait_for_timeout(100)
  check(str(w)+' no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  check(str(w)+' native controls usable',p.locator('#desktopFullscreen').is_visible())
  if w in [1440,390]:p.screenshot(path=str(Q/f'v09-desktop-admin-MOCK-{w}.png'))
 p.evaluate('__desktop.export({state:"cancelled"})');check('Cancelled export does not claim saved','cancelled' in p.locator('#toast').inner_text().lower())
 p.evaluate('__desktop.export({state:"completed"})');check('Export completion states independent-copy requirement','independent copy' in p.locator('#toast').inner_text())
 p.evaluate('__desktop.suspend()');check('Suspend callback leaves idle state intact',p.evaluate('RetroApp.status.state==="idle"'))
 check('No JavaScript exceptions',not errors)
 b.close()
(Q/'v09-desktop-controller.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'scope':'Mock native bridge and store; no Electron/Windows execution'},indent=2)+'\n')
print('TOTAL '+str(len(checks))+' PASSED')
