"""v0.9.7 5 television shells and 7 effect settings; Chromium CSS viewport simulation."""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];Q=R/'qa'/'v097';Q.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screens=[]
def check(s,condition):
 if not condition:raise AssertionError(s)
 checks.append(s);print('PASS',s,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 html=(R/'dist/RetroBooth_Prototype.html').read_text()
 for w,h in [(1920,1080),(1280,720),(960,540),(770,360)]:
  p=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(html);p.wait_for_function('window.RetroApp?.status.ready')
  boxes={}
  for style in ['heritage','edge','space','studio','bubble']:
   p.evaluate('(s)=>document.body.dataset.screenStyle=s',style);p.wait_for_timeout(65)
   boxes[style]=p.evaluate('''()=>{const get=s=>{let r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height,r.right,r.bottom]};return {shell:get('.television'),bezel:get('.tv-bezel'),screen:get('#screen'),panel:get('.control-panel'),version:get('#staffEntry'),start:get('#touchBtn'),body:getComputedStyle(document.querySelector('.television')).backgroundImage,scrollW:document.documentElement.scrollWidth}}''')
   rect=boxes[style];check(f'{w}x{h} {style} no page horizontal overflow',rect['scrollW']<=w+1)
   check(f'{w}x{h} {style} version button in safe area',rect['version'][0]>=0 and rect['version'][4]<=w-8 and rect['version'][5]<=h-10)
   check(f'{w}x{h} {style} start button visible',rect['start'][1]>=0 and rect['start'][5]<=h-5)
   for part in ['bezel','screen','panel']:
    check(f'{w}x{h} {style} same {part} as heritage',all(abs(rect[part][i]-boxes['heritage'][part][i])<1 for i in range(4)))
   if (w,h)==(1280,720):
    path=Q/f'v097-{style}-1280x720.png';p.screenshot(path=str(path));screens.append(str(path))
  check(f'{w}x{h} material variants visually distinct',len({boxes[x]['body'] for x in boxes})==5)
  p.close()
 p=b.new_page(viewport={'width':1280,'height':720});p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content(html);p.wait_for_function('window.RetroApp?.status.ready')
 for index,style in enumerate(['edge','heritage','space','studio','bubble']):
  for i in range(5):p.locator('#staffEntry').click()
  check(f'Admin opens by 5 taps, switch to {style}',p.locator('#view-admin').is_visible())
  p.locator(f'input[name="screenStyle"][value="{style}"]').check();p.locator('#screenStyleSave').click();p.wait_for_function('RetroApp.status.view==="booth"')
  check(f'{style} persists when applied',p.locator('body').get_attribute('data-screen-style')==style)
 p.evaluate('RetroApp.go("admin")')
 for effect in ['vhs','sepia','cinema','night']:
  check(f'New Camera Lab effect {effect} available',p.locator('#lookMode option[value="'+effect+'"]').count()==1)
 check('No JS page errors',not errors)
 b.close()
(Q/'v097-style-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'screenshots':screens,'scope':'Chromium simulated viewports only, not physical Android display'},indent=2)+'\n')
print('TOTAL',len(checks),'PASSED')
