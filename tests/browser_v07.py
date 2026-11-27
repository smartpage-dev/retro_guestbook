"""v0.7 UI contracts: Chromium set_content, mock storage/network, synthetic A/V.
Backend HTTP validation is tests/cloud_api.py. This harness does NOT prove real-origin storage/CORS.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse,re,json,os,hashlib,time,base64
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
a=argparse.ArgumentParser();a.add_argument('--group',choices=['booth-cloud','guest','admin'],required=True);args=a.parse_args();checks=[];errors=[]
def check(s,v):
 if not v:raise AssertionError(s)
 checks.append(s);print('PASS '+s,flush=True)
fixture=re.search(r"fixture=r'''([\s\S]*?)'''",(R/'tests/browser_v05.py').read_text()).group(1).replace('countdown:0,returnSeconds:1,osd:false','countdown:0,returnSeconds:0,osd:false,qrDisplaySeconds:5')
fixture+=r'''
window.__api={offline:false,calls:[],next:1,deleted:false,permission:'private',received:[],meta:null};window.__aux={};
Object.defineProperty(crypto,'subtle',{value:{digest:async(alg,buf)=>{const bytes=new Uint8Array(buf);let text="";for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));const hex=await __sha(btoa(text));return Uint8Array.from(hex.match(/../g),v=>parseInt(v,16)).buffer;}},configurable:true});
BrowserStore.prototype.getAux=async k=>structuredClone(__aux[k]);BrowserStore.prototype.setAux=async(k,v)=>{__aux[k]=structuredClone(v)};
BrowserStore.prototype.appendCloudSlots=async(binding,slots)=>{__aux['cloud-pool']={binding,slots:[...(__aux['cloud-pool']?.slots||[]),...slots]}};
BrowserStore.prototype.takeCloudSlot=async(binding,id)=>{const p=__aux['cloud-pool'];return p?.binding===binding?{...p.slots.shift(),localId:id}:null};
BrowserStore.prototype.mutateClip=async(id,fn)=>{const i=__fx.clips.findIndex(c=>c.id===id);if(__fx.clips[i].lifecycle==='deleted')return __fx.clips[i];return __fx.clips[i]=fn(__fx.clips[i]);};
BrowserStore.prototype.ackCloudDeletion=async id=>{const i=__fx.clips.findIndex(c=>c.id===id);__fx.clips[i]={id,lifecycle:'deleted',cloudDeleted:true};};
window.__bundle={enabled:true,serverOrigin:'https://retro.example.test',eventId:'a'.repeat(32),deviceId:'b'.repeat(32),deviceToken:'b'.repeat(32)+'.'+'D'.repeat(32),expiresAt:Math.floor(Date.now()/1000)+86400};
window.fetch=async(url,opt)=>{__api.calls.push({url,method:opt.method,state:RetroApp.status.state});if(__api.offline)throw new TypeError('Fixture offline');let d={};
 if(url.endsWith('/verify'))d={deviceId:__bundle.deviceId,event:{id:__bundle.eventId,expiresAt:__bundle.expiresAt},publicOrigin:__bundle.serverOrigin};
 else if(url.endsWith('/reserve'))d={slots:Array.from({length:JSON.parse(opt.body).count},()=>{const id=(__api.next++).toString(16).padStart(32,'0');return {id,eventId:__bundle.eventId,ownerToken:id+'.'+'O'.repeat(32),viewToken:id+'.'+'V'.repeat(32),expiresAt:__bundle.expiresAt};})};
 else if(url.endsWith('/status'))d={id:url.split('/').at(-2),status:__api.deleted?'deleted':'uploading',permission:__api.permission,moderation:'pending',revision:2};
 else if(url.endsWith('/init')){__api.meta=JSON.parse(opt.body);d={status:'uploading',received:__api.received};}
 else if(url.includes('/chunk/')){__api.received.push(Number(url.split('/').at(-1)));d={accepted:true};}
 else if(url.endsWith('/complete'))d={ready:true,sha256:__api.meta.sha256,size:__api.meta.size};
 else if(url.endsWith('/ack-delete'))d={acknowledged:true};
 else if(url.endsWith('/delete')){__api.deleted=true;d={deleted:true};}
 return {ok:true,status:200,json:async()=>d};};
'''
def state(page,s,timeout=25000):
 try:page.wait_for_function('(s)=>RetroApp.status.state===s',arg=s,timeout=timeout)
 except Exception:
  print('STATE FAILURE',page.evaluate('({state:RetroApp.status.state,error:document.getElementById("errorText").textContent,clips:__fx.clips.length})'),flush=True);raise

def inline_page(kind):
 h=(R/f'cloud/public_html/{kind}/index.html').read_text()
 h=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','<!-- Opaque-origin UI fixture only: deployment CSP is not exercised here. -->',h)
 h=h.replace('<link rel="stylesheet" href="/assets/cloud.css">','<style>'+(R/'cloud/public_html/assets/cloud.css').read_text()+'</style>')
 h=h.replace(f'<script src="/assets/{kind}.js" defer></script>','')
 return h
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None,headless=True,args=['--no-sandbox']);p=b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(15000);p.on('pageerror',lambda e:errors.append(str(e)))
 if args.group=='booth-cloud':
  p.expose_function('__sha',lambda text:hashlib.sha256(base64.b64decode(text)).hexdigest())
  html=(R/'dist/RetroBooth_Prototype.html').read_text().replace('(async function () {',fixture+'\n(async function () {',1);p.set_content(html);p.wait_for_function('window.RetroApp?.status.ready');p.evaluate('RetroApp.go("admin")');p.wait_for_timeout(100)
  check('cloud off by default','LOCAL-ONLY' in p.locator('#cloudStatus').inner_text())
  check('no API calls before configuration',p.evaluate('__api.calls.length===0'))
  p.locator('#cloudBundle').fill(p.evaluate('JSON.stringify(__bundle)'));p.locator('#cloudConnect').click();p.wait_for_function('cloudStatus.textContent.includes("12 reserved")')
  check('bundle removed from textarea after verification',p.locator('#cloudBundle').input_value()=='')
  check('reserved pool saved',p.evaluate('__aux["cloud-pool"].slots.length===12'))
  check('cloud configure does not reset duration or styles',p.evaluate('RetroApp.status.settings.duration===10&&RetroApp.status.settings.lookMode==="follow"'))
  for w,h in [(1440,1000),(800,720),(390,844),(320,720)]:
   p.set_viewport_size({'width':w,'height':h});p.locator('#cloudCard').scroll_into_view_if_needed();p.wait_for_timeout(100)
   check(str(w)+' Cloud Admin no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(str(w)+' Cloud controls visible',p.locator('#cloudConnect').is_visible())
   if w in [1440,390]:p.screenshot(path=str(Q/f'v07-booth-cloud-admin-{w}.png'))
  p.set_viewport_size({'width':1920,'height':1080});p.locator('#cameraLabEnable').click();p.wait_for_function('RetroApp.status.mode==="real"');p.evaluate('RetroApp.go("booth")');p.locator('#touchBtn').click();state(p,'recording');p.wait_for_timeout(700)
  check('one reserved link consumed before recording',p.evaluate('__aux["cloud-pool"].slots.length===11'))
  check('camera panel reflects configured cloud mode',p.locator('#panelBoundary').inner_text()=='CAMERA ON / CLOUD ENABLED')
  check('no upload requests during capture',p.evaluate('!__api.calls.some(c=>c.url.includes("/chunk/")||c.url.endsWith("/init"))'))
  p.evaluate('RetroApp.start("touch")');check('duplicate Start cannot consume another link',p.evaluate('__aux["cloud-pool"].slots.length===11'))
  state(p,'qr',40000)
  check('real encoded clip has frozen cloud identity',p.evaluate('__fx.clips[0].kind==="real"&&!!__fx.clips[0].cloud.ownerToken&&__fx.clips[0].blob.size>1000'))
  check('cloud QR only shown after local save',p.evaluate('__fx.clips[0].deliverySnapshot.online===true'))
  expected=p.evaluate('__fx.clips[0].deliverySnapshot.payload');check('real private link not demo marker',expected.startswith('https://retro.example.test/guest/#') and 'NO-ONLINE' not in expected)
  check('real cloud QR still not bypassed by disconnected printer',p.locator('#deliveryOverlay').is_visible())
  check('no upload request while QR visible',p.evaluate('!__api.calls.some(c=>c.url.includes("/chunk/"))'))
  check('public QA projection redacts cloud credentials',p.evaluate('!JSON.stringify(RetroApp.clips).includes("O".repeat(32))&&!JSON.stringify(RetroApp.clips).includes("D".repeat(32))'))
  p.screenshot(path=str(Q/'v07-private-qr-1920.png'));p.locator('#deliveryQrCanvas').screenshot(path=str(Q/'v07-private-qr-symbol.png'));(Q/'v07-private-qr-expected.txt').write_text(expected)
  state(p,'idle',10000);p.wait_for_function('__fx.clips[0].cloud.status==="ready"',timeout=25000)
  check('idle queue finishes hash-verified transfer',p.evaluate('__fx.clips[0].cloud.verifiedAt>0&&__api.received.length>0'))
  check('local video retained after cloud success',p.evaluate('__fx.clips[0].blob.size>1000'))
  check('encoded capture ran full configured duration',p.evaluate('__fx.clips[0].durationMs>=10000'))
  p.evaluate('RetroApp.go("library")');check('library reflects cloud completion', 'Cloud: ready.' in p.locator('#libraryGrid').inner_text())
  p.evaluate('RetroApp.go("admin")');p.locator('#cloudCard').scroll_into_view_if_needed();p.screenshot(path=str(Q/'v07-cloud-ready-admin.png'))
  p.evaluate('__api.permission="hidden"');p.locator('#cloudRetry').click();p.wait_for_function('__fx.clips[0].guestPermission==="hidden"');check('remote Hide syncs without deleting video',p.evaluate('__fx.clips[0].blob.size>1000'))
  p.evaluate('__api.deleted=true');p.locator('#cloudRetry').click();p.wait_for_function('__fx.clips[0].lifecycle==="deleted"');check('remote Delete purges all local media fields',p.evaluate('!__fx.clips[0].blob&&!__fx.clips[0].thumbnail&&!__fx.clips[0].rawSnapshot'))
  p.wait_for_function('__fx.clips[0].cloudDeleted===true',timeout=12000);check('cleanup acknowledgement removes credentials',p.evaluate('!__fx.clips[0].cloud'))
  p.locator('#cloudDisable').click();p.wait_for_function('cloudStatus.textContent.includes("LOCAL-ONLY")');check('local-only selection is explicit',p.evaluate('__aux["cloud-connection"].enabled===false'))
 elif args.group=='guest':
  p.set_viewport_size({'width':390,'height':844});p.set_content(inline_page('guest'));p.evaluate('location.hash="'+('a'*32+'.'+'O'*32)+'"')
  p.evaluate(r'''window.__g={status:'reserved',canManage:true,permission:'private',moderation:'pending',showEnabled:false,allowGuestDelete:false,title:'Luce / Test Event',id:'a'.repeat(32),devicePurgeAck:false,calls:[],fail:false};window.fetch=async(url,opt)=>{__g.calls.push({url,opt});if(__g.fail)throw new TypeError('Fixture offline');let d={...__g};if(url.endsWith('/permission')){__g.permission=JSON.parse(opt.body).permission;d={permission:__g.permission};}if(url.endsWith('/delete')){__g.status='deleted';d={deleted:true};}return {ok:true,json:async()=>d};};void 0;''')
  p.add_script_tag(content=(R/'cloud/public_html/assets/guest.js').read_text());p.wait_for_function('status.textContent.includes("PENDING")' .replace('status.textContent','document.getElementById("status").textContent'))
  check('pending page does not require booth waiting',p.locator('#waiting').is_visible())
  check('owner privacy toggles hidden until Cloud enables them',p.locator('#privacy').is_hidden())
  p.evaluate('__g.showEnabled=true;__g.allowGuestDelete=true;document.dispatchEvent(new Event("visibilitychange"))')
  p.wait_for_function('document.querySelector("#privacy").hidden===false')
  check('owner receives privacy controls when Cloud enables each feature',p.locator('#showConsent').is_visible() and p.locator('#ownerDelete').is_visible())
  p.screenshot(path=str(Q/'v07-guest-pending-390.png'),full_page=True)
  p.locator('#hide').click();p.wait_for_function('__g.permission==="hidden"');p.wait_for_timeout(100);check('Hide is reversible and keeps recording',p.evaluate('__g.status==="reserved"') and p.locator('#allow').is_enabled())
  p.locator('#allow').click();p.wait_for_function('__g.permission==="allow"');check('Allow does not grant staff approval',p.evaluate('__g.moderation==="pending"'))
  p.locator('#delete').click();check('delete has explicit confirmation',p.locator('#deleteDialog').is_visible() and p.locator('#deleteConfirm').is_disabled());p.screenshot(path=str(Q/'v07-guest-delete-dialog-390.png'))
  p.locator('#deleteCancel').click();check('cancel has no delete request',p.evaluate('!__g.calls.some(c=>c.url.endsWith("/delete"))'))
  p.locator('#delete').click();p.locator('#deleteAck').check();p.evaluate('__g.fail=true');p.locator('#deleteConfirm').click();p.wait_for_function('deleteError.textContent.includes("not confirmed")');check('network failure does not claim deleted',p.evaluate('__g.status==="reserved"') and p.locator('#deleteDialog').is_visible())
  p.evaluate('__g.fail=false');p.locator('#deleteConfirm').click();p.wait_for_function('document.getElementById("status").textContent.includes("DELETED")');check('delete clears guest player and controls',p.locator('#video').is_hidden() and p.locator('#privacy').is_hidden());check('offline booth cleanup explicitly pending','Waiting for booth cleanup' in p.locator('#status').inner_text())
  p.evaluate('__g.status="reserved";__g.canManage=false;location.hash="'+('a'*32+'.'+'V'*32)+'"');p.wait_for_function('!viewOnly.hidden');check('view-only has no management controls',p.locator('#privacy').is_hidden())
  for w in [320,390,800]:
   p.set_viewport_size({'width':w,'height':844});check(str(w)+' guest fits viewport',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 elif args.group=='admin':
  p.set_content(inline_page('admin'));p.evaluate(r'''window.__m={calls:[],events:[{id:'a'.repeat(32),title:'Luce / Test Event',issueOpen:true,uploadOpen:true}],clips:[{id:'c'.repeat(32),seq:1,status:'ready',permission:'hidden',moderation:'pending',createdAt:123}]};window.fetch=async(url,opt)=>{__m.calls.push({url,opt});let d={};if(url.endsWith('/events'))d={events:__m.events};else if(url.endsWith('/clips'))d={clips:__m.clips};else if(url.endsWith('/devices'))d={devices:[]};else if(url.includes('/event/')){Object.assign(__m.events[0],JSON.parse(opt.body));d=__m.events[0];}return {ok:true,json:async()=>d};};void 0;''');p.add_script_tag(content=(R/'cloud/public_html/assets/admin.js').read_text());check('admin opens locked without list data',p.locator('#dashboard').is_hidden())
  p.locator('#adminKey').fill('A'*64);p.locator('#loginBtn').click();p.wait_for_function('!dashboard.hidden');check('key input clears after login',p.locator('#adminKey').input_value()=='');check('private clips not automatically public','guest: hidden' in p.locator('#clips').inner_text().lower())
  p.locator('#issueToggle').click();p.wait_for_function('__m.events[0].issueOpen===false');check('close new reservations leaves upload drain enabled',p.evaluate('__m.events[0].uploadOpen===true'))
  p.locator('#uploadToggle').click();p.wait_for_function('__m.events[0].uploadOpen===false');check('drain pause is separate explicit action',True)
  for w in [1440,800,390,320]:
   p.set_viewport_size({'width':w,'height':1000});fits=p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   if not fits:
    print('CLOUD ADMIN OVERFLOW',p.evaluate('''()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,over:[...document.querySelectorAll('*')].map(e=>({name:e.tagName+'#'+e.id+'.'+String(e.className).slice(0,40),r:e.getBoundingClientRect()})).filter(x=>x.r.right>innerWidth+1&&x.r.width>0).slice(0,20).map(x=>[x.name,Math.round(x.r.right),Math.round(x.r.width)])})'''),flush=True)
    p.screenshot(path=str(Q/f'v07-cloud-admin-overflow-{w}.png'),full_page=True)
   check(str(w)+' cloud Admin fits viewport',fits)
   if w==1440:p.screenshot(path=str(Q/'v07-cloud-admin-1440.png'),full_page=True)
  p.locator('#logout').click();check('logout clears sensitive UI',p.locator('#dashboard').is_hidden() and p.locator('#clips').inner_text()=='');check('logout explains grant expiry','signed out' in p.locator('#message').inner_text().lower())
 check('no uncaught JavaScript errors',not errors)
 (Q/f'v07-{args.group}.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'scope':'Opaque-origin UI harness; mocked API/storage and synthetic A/V, not real permissions/CSP/CORS or Android'},indent=2)+'\n');b.close()
print('TOTAL '+str(len(checks))+' PASSED',flush=True)
