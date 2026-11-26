"""v0.9.4 modern CRT geometry, tap-access and Heritage no-regression checks.
Browser-only CSS/DOM contract; this is NOT a physical Android display acceptance test.
"""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'/'v094';QA.mkdir(parents=True,exist_ok=True)
checks=[];measures=[];errors=[]
def check(name, passed):
    if not passed: raise AssertionError(name)
    checks.append(name)
    print('PASS',name,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
    html=(ROOT/'dist/RetroBooth_Prototype.html').read_text()
    for w,h in [(1920,1080),(1366,768),(1280,720),(1024,600),(960,540),(800,360),(770,360)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
        signatures={}
        for style in ['heritage','edge']:
            page.evaluate('(s)=>document.body.dataset.screenStyle=s',style)
            page.wait_for_timeout(70)
            measured=page.evaluate('''() => {
                const el=s=>document.querySelector(s);
                const bounds=s=>{const r=el(s).getBoundingClientRect();return Object.fromEntries(['x','y','width','height','right','bottom'].map(k=>[k,Math.round(r[k]*100)/100]))};
                const name=el('#staffEntry');const foot=el('.panel-footer');
                const v=window.visualViewport;
                return {viewport:[innerWidth,innerHeight],shell:bounds('.television'),bezel:bounds('.tv-bezel'),screen:bounds('#screen'),panel:bounds('.control-panel'),button:bounds('#touchBtn'),version:bounds('#staffEntry'),footer:bounds('.panel-footer'),panelClientHeight:el('.control-panel').clientHeight,panelScrollHeight:el('.control-panel').scrollHeight,docWidth:document.documentElement.scrollWidth,visualViewport:v?[v.width,v.height]:null,shape:getComputedStyle(el('.tv-bezel')).borderRadius,background:getComputedStyle(el('.television')).backgroundImage,versionText:name.textContent};
            }''')
            signatures[style]=measured
            if style=='edge':
                check(f'{w}x{h} Modern CRT outer shell viewport fit',measured['shell']['width']==w and measured['shell']['height']==h)
                check(f'{w}x{h} Modern CRT version accessible',measured['version']['y']>=0 and measured['version']['right']<=w-8 and measured['version']['bottom']<=h-12)
                check(f'{w}x{h} Modern CRT start accessible',0<measured['button']['y'] and measured['button']['bottom']<h-5)
                check(f'{w}x{h} Modern CRT no horizontal scroll',measured['docWidth']<=w+1)
                check(f'{w}x{h} Modern CRT glass bezel present',measured['bezel']['x']>0 and measured['screen']['x']>measured['bezel']['x'] and measured['shape']!='0px')
                check(f'{w}x{h} Version text updated', '0.9.5' in measured['versionText'])
            measures.append({'style':style,**measured})
        for field in ('shell','bezel','screen','panel'):
            for prop in ('x','y','width','height'):
                x=signatures['edge'][field][prop];y=signatures['heritage'][field][prop]
                check(f'{w}x{h} shared {field}.{prop}',abs(x-y)<.15)
        check(f'{w}x{h} distinct materials',signatures['edge']['background']!=signatures['heritage']['background'])
        if (w,h) in [(1920,1080),(1280,720),(770,360)]:
            page.screenshot(path=str(QA/f'v094-ModernCRT-{w}x{h}.png'))
            page.evaluate("document.body.dataset.screenStyle='heritage'")
            page.screenshot(path=str(QA/f'v094-Heritage-{w}x{h}.png'))
        page.close()
    # Test actual five taps, not just hit box visibility. Android WebView may need staff entry repeatedly.
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
    check('initial setting is Heritage',page.locator('body').get_attribute('data-screen-style')=='heritage')
    for i in range(5):page.locator('#staffEntry').click()
    check('actual 5-tap version opens Admin',page.locator('#view-admin').is_visible())
    check('Modern CRT selector exists',page.locator('#styleEdge').count()==1)
    page.locator('#styleEdge').check()
    page.locator('#screenStyleSave').click()
    page.wait_for_function('RetroApp.status.view==="booth"')
    check('UI setting switches to Modern CRT',page.locator('body').get_attribute('data-screen-style')=='edge')
    check('start still usable after style switch',page.locator('#touchBtn').is_enabled())
    for i in range(5):page.locator('#staffEntry').click()
    check('5-tap version still opens Admin in Modern CRT',page.locator('#view-admin').is_visible())
    for w,h in [(770,360),(960,540)]:
        page.set_viewport_size({'width':w,'height':h})
        page.evaluate("RetroApp.go('booth')")
        page.evaluate("RetroApp.applyScreenStyle('edge')")
        page.wait_for_function("document.body.dataset.screenStyle==='edge'")
        for i in range(5):page.locator('#staffEntry').click()
        check(f'{w}x{h} five taps on Version open Admin',page.locator('#view-admin').is_visible())
    check('no JavaScript runtime errors',not errors)
    browser.close()
(QA/'v094_browser_report.json').write_text(json.dumps({'assertions':len(checks),'passed':len(checks),'viewport_checks':measures,'errors':errors,'scope':'Desktop Chromium simulated CSS viewports; not physical 32-inch Android hardware'},indent=2)+'\n')
print(f'TOTAL {len(checks)} PASSED',flush=True)
