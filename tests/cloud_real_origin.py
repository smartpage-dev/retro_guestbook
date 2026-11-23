"""Required CI end-to-end cloud test on a normal loopback browser origin.
NOT executed in the restricted authoring browser: see qa/real-origin.json.
Uses real PHP, real IndexedDB, real Chromium APIs with fake camera/audio devices, never physical hardware.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import tempfile,subprocess,os,time,json,socket,urllib.request,hashlib,signal
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True);checks=[]
def check(n,v):
 if not v:raise AssertionError(n)
 checks.append(n);print('PASS '+n,flush=True)
with tempfile.TemporaryDirectory(prefix='retro-origin-cloud-') as t:
 root=Path(t);sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();origin=f'http://127.0.0.1:{port}';key=os.urandom(32).hex()
 cfg=root/'config.php';cfg.write_text("<?php return ['publicOrigin'=>'"+origin+"','adminKey'=>'"+key+"','signingKey'=>'"+os.urandom(32).hex()+"','dataDir'=>'"+str(root/'data')+"','quotaBytes'=>67108864,'corsOrigins'=>[],'allowLoopbackHttp'=>true];")
 log=(Q/'cloud-origin-server.log').open('w');server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(R/'cloud/public_html'),str(R/'cloud/router.php')],env={**os.environ,'RETRO_CONFIG':str(cfg)},stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 def api(path,body):
  req=urllib.request.Request(origin+'/api/admin/'+path,data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'});return json.loads(urllib.request.urlopen(req,timeout=15).read())
 try:
  time.sleep(.8);event=api('events',{'title':'CI synthetic event','days':1});bundle=api('device',{'eventId':event['id'],'label':'CI fake camera'})
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
   c=browser.new_context(viewport={'width':1440,'height':1000},permissions=['camera','microphone']);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.goto(origin+'/booth/?setup=1');p.wait_for_function('RetroApp.status.ready');p.locator('#cloudBundle').fill(json.dumps(bundle));p.locator('#cloudConnect').click();p.wait_for_function('cloudStatus.textContent.includes("12 reserved")')
   check('real server verifies bundle and stores pool',p.evaluate('RetroApp.status.storageAvailable'))
   p.locator('#cameraLabEnable').click();p.wait_for_function('RetroApp.status.mode==="real"');p.evaluate('RetroApp.saveDeliverySettings({qrDisplaySeconds:5})');p.evaluate('RetroApp.go("booth")');p.locator('#touchBtn').click();p.wait_for_function('RetroApp.status.state==="qr"',timeout=30000)
   read='async()=>{const s=new BrowserStore();await s.open();const rows=await s.list();return rows.map(c=>({id:c.id,life:c.lifecycle,cloud:c.cloud,bytes:c.blob?.size}));}'
   rows=p.evaluate(read);local=rows[0];check('clip and reserved owner identity committed',bool(local['cloud']['ownerToken']) and local['bytes']>0)
   p.wait_for_function('RetroApp.status.state==="idle"',timeout=10000);p.wait_for_function('RetroApp.clips[0].cloudState==="ready"',timeout=30000)
   p.reload();p.wait_for_function('RetroApp.status.ready');check('cloud binding and local file survive reload',p.evaluate(read)[0]['bytes']==local['bytes'])
   guest=c.new_page();guest.goto(origin+'/guest/#'+local['cloud']['ownerToken']);guest.wait_for_function('document.getElementById("status").textContent.includes("READY")',timeout=15000)
   guest.locator('#video').evaluate('async v=>{v.muted=true;await v.play()}');guest.wait_for_timeout(500);check('real authenticated cloud media plays',guest.locator('#video').evaluate('v=>v.currentTime>0'))
   guest.locator('#hide').click();guest.wait_for_function('permissionText.textContent.includes("Hidden")');check('Hide keeps playback source',guest.locator('#video').is_visible())
   guest.locator('#delete').click();guest.locator('#deleteAck').check();guest.locator('#deleteConfirm').click();guest.wait_for_function('document.getElementById("status").textContent.includes("DELETED")');check('real guest delete revokes online controls',guest.locator('#privacy').is_hidden())
   p.bring_to_front();p.evaluate('RetroApp.go("admin")');p.locator('#cloudRetry').click();p.wait_for_function('RetroApp.clips.length===0',timeout=20000);time.sleep(3);rows=p.evaluate(read);check('real IDB media purged after sync',rows[0].get('bytes') is None and rows[0]['life']=='deleted')
   check('no booth runtime errors',not errors);browser.close()
  (Q/'cloud-real-origin.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Real PHP/local browser origin/IndexedDB, fake Chromium camera; not Android hardware'},indent=2)+'\n');print('TOTAL '+str(len(checks))+' PASSED')
 finally:
  os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10);log.close()
