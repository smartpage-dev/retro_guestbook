"""Real Cloud Admin/browser + Drive API authorization smoke (Google transport is NOT contacted)."""
from pathlib import Path
import os,sys,subprocess,tempfile,time,socket,urllib.request,urllib.error,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='retro-drive-http-') as td:
 t=Path(td);sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
 origin=f'http://127.0.0.1:{port}';admin='a'*64
 (t/'config.php').write_text("<?php return ['publicOrigin'=>'"+origin+"','adminKey'=>'"+admin+"','signingKey'=>'"+'s'*64+"','dataDir'=>'"+str(t/'private')+"','quotaBytes'=>33554432,'corsOrigins'=>[],'allowLoopbackHttp'=>true];")
 serverlog=open(t/'server.log','w');env={**os.environ,'RETRO_CONFIG':str(t/'config.php')}
 server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(R/'cloud/public_html'),str(R/'cloud/router.php')],stdout=serverlog,stderr=subprocess.STDOUT,env=env,start_new_session=True)
 def req(path,token='',body=None):
  headers={'Authorization':'Bearer '+token} if token else {}
  if body is not None:headers['Content-Type']='application/json'
  r=urllib.request.Request(origin+path,headers=headers,data=json.dumps(body).encode() if body is not None else None)
  try:resp=urllib.request.urlopen(r,timeout=8)
  except urllib.error.HTTPError as e:resp=e
  content=resp.read()
  try:data=json.loads(content)
  except ValueError:data=content.decode('utf-8','replace')
  return resp.status,data
 try:
  for _ in range(50):
   try:
    if req('/api/health')[0]==200:break
   except OSError:pass
   time.sleep(.1)
  else:raise RuntimeError('server unavailable')
  assert req('/api/admin/drive/status')[0]==401
  assert req('/api/admin/drive/status','b'*64)[0]==401
  st,data=req('/api/admin/drive/status',admin);assert st==200 and data['connected'] is False and data['configured'] is False
  assert req('/api/admin/drive/options',admin,{'autoForNewEvents':True})[0]==409
  assert req('/api/admin/drive/start',admin,{'mode':'connect'})[0]==409
  assert req('/api/admin/drive/folder',admin,{'name':'bad'})[0]==409
  assert req('/api/admin/drive/event',admin,{'eventId':'f'*32,'enabled':True})[0]==409
  assert req('/api/drive/oauth/callback')[0] in [400,403]
  print('PASS seven Drive HTTP authorization/configuration failsafe checks',flush=True)
  (R/'qa').mkdir(exist_ok=True)
  # Offline Chromium UI assertions: no browser access to a localhost server is
  # needed. All HTTP security checks above execute against the real PHP API.
  import re, shutil
  html=(R/'cloud/public_html/admin/index.html').read_text()
  html=re.sub(r'<meta\s+http-equiv="Content-Security-Policy"[^>]*>', '',html,flags=re.I)
  html=re.sub(r'<link rel="stylesheet"[^>]*>', '',html,flags=re.I)
  html=re.sub(r'<script src="/assets/admin.js" defer></script>', '',html,flags=re.I)
  css=(R/'cloud/public_html/assets/cloud.css').read_text()
  js=(R/'cloud/public_html/assets/admin.js').read_text()
  with sync_playwright() as pw:
   chrome=shutil.which('chromium') or shutil.which('chromium-browser')
   launch=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   if chrome:launch['executable_path']=chrome
   browser=pw.chromium.launch(**launch)
   for width,height in [(390,844),(800,360),(1440,900)]:
    page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html,wait_until='load')
    page.add_style_tag(content=css)
    # Drive controls must be rendered by the *actual* admin.js client against a
    # deterministic API; Google OAuth and network are not contacted in this test.
    page.evaluate('''() => {
      const fakeId='a'.repeat(32); let created=false;
      window.fetch=async(url,opts)=>{
        const path=String(url); const json=opts&&opts.body?JSON.parse(opts.body):{};
        let body={};
        if(path.endsWith('/events') && opts.method==='POST'){created=true;body={id:fakeId};}
        else if(path.endsWith('/events'))body={events:created?[{id:fakeId,title:'Retro Wedding Test',issueOpen:true,uploadOpen:true,expiresAt:4102444800}]:[]};
        else if(path.endsWith('/drive/status'))body={configured:false,connected:false,parent:null,autoForNewEvents:false,
            events:created?[{id:fakeId,name:'Retro Wedding Test',enabled:false,ready:0,total:0,failed:0,deleting:0}]:[]};
        else if(path.endsWith('/clips'))body={clips:[]};
        else if(path.endsWith('/archive'))body={status:'none',count:0,bytes:0,parts:[]};
        else if(path.endsWith('/devices'))body={devices:[]};
        else return {ok:false,json:async()=>({error:'unexpected mock request: '+path})};
        return {ok:true,json:async()=>body};
      };
    }''')
    page.add_script_tag(content=js)
    page.locator('#adminKey').fill(admin)
    page.locator('#loginBtn').click()
    page.wait_for_function("document.querySelector('#driveStatus').textContent.includes('OAuth client not configured')")
    assert page.locator('#drivePick').is_disabled()
    assert page.locator('#driveCreateFolder').is_disabled()
    page.locator('#title').fill('Retro Wedding Test')
    page.locator('#create').click()
    page.wait_for_function("document.querySelector('#eventOverview').textContent.includes('Event aaaaa')")
    assert page.locator('#renameEvent').input_value()=='Retro Wedding Test'
    assert 'DRIVE SYNC OFF' in page.locator('#driveEventStatus').inner_text()
    assert not errors,errors
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 4'),f'horizontal overflow {width}'
    page.locator('#driveCard').screenshot(path=str(R/'qa'/f'v095-drive-admin-{width}.png'))
    print('PASS offline Chromium Cloud Admin event/Drive controls at',width,'px',flush=True)
    page.close()
   browser.close()
 finally:
  server.terminate()
  try:server.wait(timeout=4)
  except subprocess.TimeoutExpired:server.kill()
  serverlog.close()
