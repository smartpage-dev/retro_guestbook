"""Browser diagnostic UI/export checks with synthetic camera and mock native bridge."""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
old=(R/'tests/browser_v05.py').read_text();fixture=old.split("fixture=r'''",1)[1].split("'''",1)[0]
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
    page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready');page.evaluate('RetroApp.go("admin")')
    check('full export button',page.locator('#diagExport').count()==1)
    check('recent log viewer',page.locator('#diagnosticRecent').count()==1)
    check('clear logs button',page.locator('#diagClear').count()==1)
    page.evaluate('''()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Camera busy','NotReadableError')}}''')
    page.locator('#cameraSelect').select_option('')
    page.locator('#testCameraOnly').click()
    page.wait_for_function("document.querySelector('#mediaDeviceStatus').textContent.includes('FAILED')")
    check('failure event displayed', 'media_probe_failure' in page.locator('#diagnosticRecent').inner_text())
    with page.expect_download(timeout=12000) as result:page.locator('#diagExport').click()
    download=result.value
    data=json.loads(Path(download.path()).read_text())
    check('JSON schema',data['schema']=='retrobooth-diagnostic-v1')
    check('last camera failure',data['media']['lastFailure']['name']=='NotReadableError')
    check('camera failure event',any(x['name']=='media_probe_failure' for x in data['events']))
    check('runtime metadata', 'mediaRecorder' in data['runtime'])
    check('browser native diagnostics correctly unavailable',data['native']['available']==False)
    check('private data not present', 'owner-secret' not in json.dumps(data))
    page.screenshot(path=str(R/'qa/v092-admin-diagnostics-mobile.png'),full_page=True)
    check('no JavaScript errors',not errors)
    (R/'qa/v092-diagnostic-browser.json').write_text(json.dumps({'checks':checks,'count':len(checks),'scope':'Synthetic getUserMedia, browser export, no physical Android device'},indent=2)+'\n')
    browser.close()
print('TOTAL',len(checks),'PASSED')
