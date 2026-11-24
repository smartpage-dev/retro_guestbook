from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
fixture=(R/'tests/browser_v05.py').read_text().split("fixture=r'''",1)[1].split("'''",1)[0]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1)
 page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready');page.evaluate('RetroApp.go("admin")');page.locator('#deviceRefresh').click();page.locator('#testCameraOnly').click();page.wait_for_function("document.querySelector('#mediaDeviceStatus').textContent.includes('PASSED')")
 page.locator('#mediaDeviceStatus').scroll_into_view_if_needed();page.screenshot(path=str(R/'qa/Camera_Selection_Android_Hotfix_Desktop.png'))
 page.set_viewport_size({'width':390,'height':844});page.locator('#mediaDeviceStatus').scroll_into_view_if_needed();page.screenshot(path=str(R/'qa/Camera_Selection_Android_Hotfix_Mobile.png'))
 b.close()
