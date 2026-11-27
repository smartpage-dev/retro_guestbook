"""v0.9.9 source QA: distinct antique cabinets, accessible touch controls, 360p/24fps
configuration, and deterministic 60Hz render pacing. No actual encoded video or hardware.
"""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'/'v099_regression';QA.mkdir(parents=True,exist_ok=True)
html=(ROOT/'dist/RetroBooth_Prototype.html').read_text(encoding='utf8')
assert '/*__' not in html
assert 'antique-feet' in html
checks=[];errors=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    print('PASS',name,flush=True);checks.append(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
    for w,h in [(1920,1080),(1280,720),(960,540),(770,360),(390,844)]:
        page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
        s=page.evaluate('RetroApp.status.settings')
        check(f'{w}x{h} default canvas 360p',s['renderHeight']==360 and page.locator('#cameraCanvas').evaluate('el=>el.height')==360)
        check(f'{w}x{h} default fps 24',s['renderMaxFps']=='24')
        check(f'{w}x{h} camera canvas width derived from CRT aspect',page.locator('#cameraCanvas').evaluate('el=>el.width')>=288)
        for style in ['space','studio','bubble']:
            page.evaluate('(x)=>document.body.dataset.screenStyle=x',style)
            page.wait_for_timeout(32)
            metric=page.evaluate('''()=>{
              const pos=selector=>{const {x,y,right,bottom,width,height}=document.querySelector(selector).getBoundingClientRect();return {x,y,right,bottom,width,height}};
              const display=selector=>getComputedStyle(document.querySelector(selector)).display;
              return {body:document.body.dataset.screenStyle,shell:pos('.television'),screen:pos('#screen'),panel:pos('.control-panel'),start:pos('#touchBtn'),admin:pos('#staffEntry'),carry:display('.antique-top'),sidecar:display('.vintage-sidecar'),feet:display('.antique-feet'),pageWidth:document.documentElement.scrollWidth};
            }''')
            check(f'{w}x{h} {style} no document overflow',metric['pageWidth']<=w+1)
            check(f'{w}x{h} {style} touch start within viewport',metric['start']['x']>=-1 and metric['start']['right']<=w+1 and metric['start']['y']>=-1 and metric['start']['bottom']<=h+1)
            check(f'{w}x{h} {style} staff entry visible and accessible',metric['admin']['x']>=-1 and metric['admin']['right']<=w+1 and metric['admin']['y']>=-1 and metric['admin']['bottom']<=h+1)
            check(f'{w}x{h} {style} valid CRT frame',metric['screen']['width']>=40 and metric['screen']['height']>=40)
            check(f'{w}x{h} {style} cabinet-specific physical parts', (metric['carry']!='none' and metric['sidecar']=='none' and metric['feet']=='none') if style=='space' else ((metric['sidecar']!='none' if w>=700 else metric['sidecar']=='none') and metric['carry']=='none' and metric['feet']=='none') if style=='studio' else (metric['feet']!='none' and metric['sidecar']=='none'))
            if w==1280:page.screenshot(path=str(QA/f'v099-{style}-1280x720.png'))
        for style in ['heritage','edge']:
            page.evaluate('(x)=>document.body.dataset.screenStyle=x',style)
            check(f'{w}x{h} old {style} has no antique attachments',page.evaluate('''()=>['.antique-top','.vintage-sidecar','.antique-feet'].every(s=>getComputedStyle(document.querySelector(s)).display==='none')'''))
        page.close()
    page=browser.new_page(viewport={'width':1280,'height':720})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html);page.wait_for_function('window.RetroApp?.status.ready')
    page.evaluate('RetroApp.go("admin")')
    page.locator('.advanced-guest-settings summary').click()
    for fps in ['8','10','12','15','18','20','24','30','auto']:
        check('FPS option '+fps+' exists',page.locator(f'#renderMaxFpsInput option[value="{fps}"]').count()==1)
    for height in ['360','540','720']:
        check('resolution option '+height+' exists',page.locator(f'#renderHeightInput option[value="{height}"]').count()==1)
    check('24 FPS selected in Admin default',page.locator('#renderMaxFpsInput').input_value()=='24')
    check('360p selected in Admin default',page.locator('#renderHeightInput').input_value()=='360')
    page.locator('#renderMaxFpsInput').select_option('12')
    page.locator('#renderHeightInput').select_option('540')
    page.locator('#settingsForm button[type=submit]').click()
    page.wait_for_function('RetroApp.status.settings.renderMaxFps==="12"')
    check('Admin saves 12 FPS',page.evaluate('RetroApp.status.settings.renderMaxFps')=='12')
    check('Admin saves 540p',page.evaluate('RetroApp.status.settings.renderHeight')==540)
    page.locator('#renderMaxFpsInput').select_option('20')
    page.locator('#renderHeightInput').select_option('360')
    page.locator('#settingsForm button[type=submit]').click()
    page.wait_for_function('RetroApp.status.settings.renderMaxFps==="20"')
    check('Admin saves 20 FPS',page.evaluate('RetroApp.status.settings.renderMaxFps')=='20')
    check('Admin saves 360p',page.evaluate('RetroApp.status.settings.renderHeight')==360)
    page.evaluate('RetroApp.go("booth")')
    for style in ['space','studio','bubble']:
        page.evaluate('(s)=>RetroApp.applyScreenStyle(s)',style)
        page.wait_for_function('document.body.dataset.screenStyle!=="heritage"')
        for _ in range(5):page.locator('#staffEntry').click()
        check(f'{style} 5-tap control opens Admin',page.locator('#view-admin').is_visible())
        page.evaluate('RetroApp.go("booth")')
    # Exercise actual getUserMedia constraints through the existing synthetic camera fixture.
    # This catches 540p accidentally requesting a 720p camera source.
    camera_fixture=(ROOT/'tests/browser_v05.py').read_text().split("fixture=r'''",1)[1].split("'''",1)[0]
    for height,width in [(360,640),(540,960),(720,1280)]:
        cp=browser.new_page(viewport={'width':960,'height':540})
        cp.on('pageerror',lambda e:errors.append(str(e)))
        cp.set_content(html.replace('(async function () {',camera_fixture+'\n(async function () {',1))
        cp.wait_for_function('window.RetroApp?.status.ready')
        cp.evaluate('RetroApp.go("admin")')
        cp.locator('.advanced-guest-settings summary').click()
        cp.locator('#renderHeightInput').select_option(str(height))
        cp.locator('#renderMaxFpsInput').select_option('20')
        cp.locator('#settingsForm button[type=submit]').click()
        cp.wait_for_function('(height)=>RetroApp.status.settings.renderHeight===height',arg=height)
        cp.locator('#applyCameraOnly').click()
        cp.wait_for_function('window.__fx?.constraints.some(c=>c.video!==false)')
        actual=cp.evaluate('()=>__fx.constraints.find(c=>c.video!==false).video')
        check(f'{height}p sensor request {width}x{height}',actual['height']['ideal']==height and actual['width']['ideal']==width)
        check(f'{height}p sensor request 20fps',actual['frameRate']['ideal']==20)
        cp.close()
    # Deterministic rAF stepping simulates a 60Hz clock without touching real camera or encoder.
    rates=page.evaluate('''()=>{
        const original=requestAnimationFrame;
        window.requestAnimationFrame=()=>0;
        const results={};
        for(const target of ['8','12','20','24','30']){
            const c=document.createElement('canvas');
            const r=new RetroRenderer(c,document.querySelector('#inputVideo'),RetroCore.safeSettings({renderMaxFps:target}),{backend:'2d'});
            let draws=0;r.draw=()=>draws++;
            r.frameCount=0;r.nextFrameAt=0;r.fpsStart=0;
            for(let step=0;step<60;step++)r.loop(step*(1000/60));
            r.running=false;results[target]=draws;
        }
        window.requestAnimationFrame=original;
        return results;
    }''')
    for fps,minimum,maximum in [('8',7,9),('12',11,13),('20',19,21),('24',23,25),('30',29,31)]:
        check(f'60Hz synthetic {fps}fps pacing ({rates[fps]} frames)',minimum<=rates[fps]<=maximum)
    check('requestCaptureStream rate linked to selected settings', 'captureStream(fps)' in (ROOT/'src/app.js').read_text())
    check('source getUserMedia rate linked to selected settings','frameRate:{ideal:fps,max:30}' in (ROOT/'src/app.js').read_text())
    # Simulated prior IndexedDB profile: only a legacy default is migrated.
    fixture = '''
window.__upgradeSpy={initial:__PROFILE__,writes:[],markers:[]};
BrowserStore.prototype.open=async function(){this.available=true;return true};
BrowserStore.prototype.getSettings=async()=>({value:structuredClone(__upgradeSpy.initial)});
BrowserStore.prototype.setSettings=async value=>{__upgradeSpy.writes.push(structuredClone(value));};
BrowserStore.prototype.getAux=async()=>null;
BrowserStore.prototype.setAux=async(k,v)=>{__upgradeSpy.markers.push([k,v]);};
BrowserStore.prototype.list=async()=>[];
BrowserStore.prototype.getSequence=async()=>({next:1});
'''
    for original,expected_migration in [({'renderMaxFps':'auto','renderHeight':720},True),({'renderMaxFps':'12','renderHeight':540},False)]:
        code=fixture.replace('__PROFILE__',json.dumps(original))
        p2=browser.new_page(viewport={'width':960,'height':540})
        p2.on('pageerror',lambda e:errors.append(str(e)))
        p2.set_content(html.replace('(async function () {',code+'\n(async function () {',1))
        p2.wait_for_function('window.RetroApp?.status.ready')
        d=p2.evaluate('''()=>({fps:RetroApp.status.settings.renderMaxFps,height:RetroApp.status.settings.renderHeight,writes:__upgradeSpy.writes,markers:__upgradeSpy.markers})''')
        if expected_migration:
            check('old Auto/720 profile migrates once to 24/360',d['fps']=='24' and d['height']==360 and len(d['writes'])==1)
        else:
            check('custom legacy FPS and height preserved',d['fps']=='12' and d['height']==540 and not d['writes'])
        check('migration marker saved once',d['markers']==[['v099-performance-profile-checked',True]])
        p2.close()
    check('no uncaught browser errors',not errors)
    browser.close()
report={'tests':len(checks),'passed':len(checks),'errors':errors,'60HzSyntheticFrameCounts':rates,'scope':'Standalone Chromium test with synthetic settings and virtual frame-time stepping; NO real Android, camera, encoder, SPP, Hostinger deployment'}
(QA/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print('TOTAL',len(checks),'PASSED')
