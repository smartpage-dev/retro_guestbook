"""Optional CI integration: loopback HTTPS-trustworthy origin + Chromium FAKE media.
This is not a physical camera, Android WebView or power-loss recovery test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,os,subprocess,time,json,socket
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--require-origin',action='store_true');args=a.parse_args()
checks=[];errors=[];status='not_run';reason='';code=1
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
env={**os.environ,'PORT':str(port)};log=(Q/'real-origin-server.log').open('w')
server=subprocess.Popen(['node','tools/serve.mjs'],cwd=R,env=env,stdout=log,stderr=subprocess.STDOUT)
def check(n,v):
 if not v:raise AssertionError(n)
 checks.append(n);print('PASS',n,flush=True)
try:
 time.sleep(.6)
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
  context=b.new_context(viewport={'width':1280,'height':720});origin=f'http://127.0.0.1:{port}';context.grant_permissions(['camera','microphone'],origin=origin)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
  try:
   page.goto(origin+'/?setup=1');page.wait_for_function('window.RetroApp?.status.ready')
   check('secure local origin and real IndexedDB are available',page.evaluate('isSecureContext&&RetroApp.status.storageAvailable'))
   page.evaluate('RetroApp.applyScreenStyle("edge")');page.reload();page.wait_for_function('window.RetroApp?.status.ready')
   check('saved look restored after true reload',page.evaluate('RetroApp.status.settings.screenStyle==="edge"&&RetroApp.status.activeLook.key==="film"'))
   page.locator('#cameraLabEnable').click();page.wait_for_function('RetroApp.status.mode==="real"')
   check('real getUserMedia API opened Chromium fake devices',page.evaluate('RetroApp.status.mode==="real"'))
   page.evaluate('RetroApp.go("booth")');page.locator('#touchBtn').click();page.wait_for_function('RetroApp.status.state==="recording"')
   page.wait_for_function('RetroApp.status.state==="idle"&&RetroApp.clips.length===1',timeout=30000)
   first=page.evaluate('RetroApp.clips[0]');check('fixed ten-second encoded clip stored',first['kind']=='real' and first['sizeBytes']>1000 and first['durationMs']>=10000)
   check('stored clip metadata is readable',first['validation']['status']=='metadata_readable')
   page.reload();page.wait_for_function('window.RetroApp?.status.ready')
   check('completed clip survives true page reload',page.evaluate('(id)=>RetroApp.clips.length===1&&RetroApp.clips[0].id===id',first['id']))
   page.evaluate('RetroApp.go("library")');page.get_by_role('button',name='Play / export',exact=True).click();page.locator('#playback').evaluate('async v=>{v.muted=true;await v.play()}');page.wait_for_timeout(300)
   check('persisted Blob plays after reload',page.locator('#playback').evaluate('v=>!v.paused&&v.currentTime>0'))
   check('no runtime errors',not errors);status='passed';code=0
  except Exception as e:
   reason=str(e);status='unavailable' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in reason else 'failed';code=1 if args.require_origin or status=='failed' else 0
  finally:context.close();b.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 log.close();(Q/'real-origin.json').write_text(json.dumps({'status':status,'passed':len(checks),'checks':checks,'reason':reason,'errors':errors,'scope':'Real localhost and IndexedDB with Chromium fake devices. NOT physical webcam/permissions prompt/Android acceptance.'},indent=2)+'\n')
print(status,reason,flush=True);raise SystemExit(code)
