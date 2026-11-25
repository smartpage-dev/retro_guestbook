"""Private client ZIP UI browser contracts with API mocks, not a real-origin test."""
from pathlib import Path
import json,os,re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
token='a'*32+'.'+'B'*32
checks=[]
def check(name,okay):
 if not okay:raise AssertionError(name)
 checks.append(name);print('PASS '+name,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'cloud/public_html/client/index.html').read_text()
 css=(R/'cloud/public_html/assets/cloud.css').read_text()
 script=(R/'cloud/public_html/assets/client.js').read_text()
 check('client CSP does not require inline styles', '<style>' not in html and "style-src 'self'" in html)
 html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
 html=html.replace('<link rel="stylesheet" href="/assets/cloud.css">','<style>'+css+'</style>')
 html=html.replace('<script src="/assets/client.js"></script>','')
 page.set_content(html)
 page.evaluate('''window.__requests=[];window.fetch=async (url,options)=>{__requests.push({url,options});let data={};let ok=options.headers.Authorization==='Bearer '+('a'.repeat(32)+'.'+'B'.repeat(32));if(url.endsWith('/status'))data={status:'ready',eventTitle:'Event A',count:3,bytes:12345678,parts:[{part:1,bytes:6000000,count:2},{part:2,bytes:6345678,count:1}]};else if(url.endsWith('/authorize'))data={authorized:true};return {ok,json:async()=>ok?data:{error:'invalid_client_link'}};};void 0;''')
 # The source line that reads a query token is replaced only in this mocked/opaque-origin harness.
 script=script.replace("let token=new URLSearchParams(location.search).get('token')||'';", "let token='"+token+"';")
 page.add_script_tag(content=script)
 page.wait_for_function("document.querySelectorAll('#downloads a').length===2")
 check('API status and authorize both receive private bearer',page.evaluate('''__requests.length===2&&__requests.every(r=>r.options.headers.Authorization==='Bearer '+('a'.repeat(32)+'.'+'B'.repeat(32)))'''))
 check('client sees correct event title',page.locator('#eventTitle').inner_text()=='Event A')
 check('client has two independent ZIP links',page.locator('#downloads a').count()==2)
 check('download URLs never contain bearer secret',all(token not in a.get_attribute('href') and a.get_attribute('href').startswith('/api/client/zip/') for a in page.locator('#downloads a').all()))
 check('no client token persisted in storage',not re.search(r'\b(?:localStorage|sessionStorage)\s*[.\[]', (R/'cloud/public_html/assets/client.js').read_text()))
 for width in [320,390,800]:
  page.set_viewport_size({'width':width,'height':844});check(f'client fits {width}px',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
 page.screenshot(path=str(Q/'v094-client-zip-share-mobile.png'),full_page=True)
 page.evaluate('document.getElementById("pastePanel").hidden=false')
 page.locator('#accessToken').fill('x'*5);page.locator('#open').click()
 check('invalid manual token clears old links',page.locator('#downloads a').count()==0 and 'Invalid' in page.locator('#status').inner_text())
 check('no unhandled JS errors',not errors)
 (Q/'v094-client-ui-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Opaque-origin Chromium with mocked API, simulated query token, no live cookies. Real HTTP tested separately by cloud_api.py.'},indent=2)+'\n')
 browser.close()
print('TOTAL',len(checks),'PASSED',flush=True)
