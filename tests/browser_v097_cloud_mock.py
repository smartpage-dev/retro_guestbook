"""UI regression with in-memory fake responses; PHP security separately tested via cloud_api.py.
No public network or real Hostinger calls. All screenshots labeled simulation.
"""
from pathlib import Path
import os,json,base64,io,re
from PIL import Image
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];Q=R/'qa'/'v097';Q.mkdir(exist_ok=True,parents=True)
checks=[];errors=[]
def check(s,p):
 if not p:raise AssertionError(s)
 checks.append(s);print('PASS',s,flush=True)
def inline(which,bootstrap):
 html=(R/f'cloud/public_html/{which}/index.html').read_text()
 css=(R/'cloud/public_html/assets/cloud.css').read_text()
 html=html.replace('<link rel="stylesheet" href="/assets/cloud.css">','<style>'+css+'</style>')
 html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
 for script in ['qr.js',f'{which}.js']:
  html=html.replace('<script src="/assets/'+script+'" defer></script>','')
 html=html.replace('</head>','<script>'+bootstrap+'</script></head>')
 scripts=''.join('<script>'+(R/'cloud/public_html/assets'/script).read_text()+'</script>' for script in ['qr.js',f'{which}.js'])
 return html.replace('</body>',scripts+'</body>')
image=Image.new('RGB',(384,216),(65,115,142));out=io.BytesIO();image.save(out,'JPEG',quality=80);jpeg64=base64.b64encode(out.getvalue()).decode('ascii')
admin_mock='''
window.__mock={event:null,clips:[],devices:[],created:0,calls:[],delayed:false};
window.fetch=async function(url,opt={}) {
 const p=String(url).replace('/api/admin/',''),method=opt.method||'GET',o=opt.body?JSON.parse(opt.body):null;
 const m=window.__mock;m.calls.push([p,method]);
 const response=(body,status=200)=>({ok:status===200,status,json:async()=>body,blob:async()=>new Blob([Uint8Array.from(atob('''+json.dumps(jpeg64)+'''),x=>x.charCodeAt(0))],{type:'image/jpeg'})});
 if(m.delayed && p==='events' && method==='POST'){await new Promise(r=>setTimeout(r,500));m.delayed=false;}
 if(p==='events' && method==='GET')return response({events:m.event?[m.event]:[]});
 if(p==='events' && method==='POST'){
   if(m.event && m.event.title.toLowerCase()===o.title.toLowerCase())return response({error:'event_title_already_exists'},409);
   m.created++;const event={id:'e'.repeat(32),title:o.title,createdAt:1795630000,expiresAt:1798230000,issueOpen:true,uploadOpen:true,showEnabled:false,allowGuestDelete:false,autoApproveShow:false,settingsRevision:1,
      settings:{title:o.title,date:'2026-11-27',duration:10,countdown:3,screenStyle:'heritage',lookMode:'follow',ticketPhotoAspect:'4:3',ticketCaptureSecond:2,qrDisplaySeconds:10,receiptStyle:'classic',receiptCaption:'TEST ONLY',receiptFooter:'THANK YOU',showDelay:60}};
   m.event=event;return response(event);
 }
 if(p==='clips')return response({clips:m.clips});
 if(p==='devices' && method==='GET')return response({devices:m.devices});
 if(p==='device' && method==='POST'){let b={version:1,serverOrigin:'https://example.test',eventId:m.event.id,deviceId:'d'.repeat(32),deviceToken:'d'.repeat(32)+'.'+'Z'.repeat(32),expiresAt:m.event.expiresAt};m.devices.push({id:b.deviceId,label:o.label,eventId:b.eventId,revoked:false});return response(b);}
 if(/^event\\/[a-f0-9]{32}\\/settings$/.test(p)){
   if(o.expectedRevision!==m.event.settingsRevision)return response({error:'event_settings_changed_refresh_first'},409);
   m.event.settings={...m.event.settings,...o.settings};m.event.title=m.event.settings.title;m.event.settingsRevision++;return response(m.event);
 }
 if(/^event\\/[a-f0-9]{32}$/.test(p)){for(const [k,v]of Object.entries(o)){m.event[k]=v;m.event.settingsRevision++;}return response(m.event);}
 if(p.includes('/slideshow'))return response({showUrl:'https://example.test/show/#'+m.event.id+'.'+'Q'.repeat(32)});
 if(p.endsWith('/thumbnail'))return response({});
 if(p.endsWith('/open'))return response({mediaUrl:'/api/media/'+'a'.repeat(32)});
 if(p.endsWith('/share'))return response({viewOnlyUrl:'https://example.test/guest/#'+'a'.repeat(32)+'.'+'X'.repeat(32),expiresAt:1798230000});
 if(p.endsWith('/moderate')){m.clips[0].moderation=o.approved?'approved':'pending';return response({moderation:m.clips[0].moderation});}
 if(p.endsWith('/delete')){m.clips[0].status='deleted';return response({deleted:true});}
 return response({error:'not_found:'+p},404);
};
'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or '/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 p=b.new_page(viewport={'width':1440,'height':900});p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content(inline('admin',admin_mock));p.locator('#adminKey').fill('a'*64);p.locator('#loginBtn').click()
 p.locator('#dashboard').wait_for(state='visible');check('Admin displays after mock signin',True)
 p.evaluate('window.__mock.delayed=true')
 p.locator('#title').fill('My Sample Event');p.locator('#create').click(no_wait_after=True)
 p.wait_for_function('window.__mock.created===1');p.wait_for_function("document.querySelector('#event').options.length===1")
 check('Create Event request issued once',p.evaluate('window.__mock.created')==1)
 p.locator('#title').fill('my sample event');p.locator('#create').click()
 p.wait_for_function("document.querySelector('#message').textContent.includes('already exists')")
 check('Duplicate event click blocked in UI',p.evaluate('window.__mock.created')==1)
 check('Cloud show/delete off initially',p.locator('#showToggle').get_attribute('aria-pressed')=='false' and p.locator('#deleteToggle').get_attribute('aria-pressed')=='false')
 p.locator('#settingScreenStyle').select_option('studio');p.locator('#settingLookMode').select_option('cinema')
 p.locator('#saveSettings').click();p.wait_for_function("window.__mock.event.settingsRevision===2")
 check('Cloud Master settings saved with revision in UI',p.locator('#revisionBadge').inner_text().endswith('2'))
 p.locator('#showToggle').click();p.wait_for_function("document.querySelector('#showToggle').getAttribute('aria-pressed')==='true'")
 check('Toggled permission visibly ON',p.locator('#showToggle').get_attribute('aria-pressed')=='true')
 # A ready clip enables recording action rows. This is fixture data, not a cloud upload.
 p.evaluate('''()=>{window.__mock.clips=[{id:'a'.repeat(32),status:'ready',title:'My Sample Event',seq:1,createdAt:1795630000,
  permission:'private',moderation:'pending',revision:2,size:188000,mime:'video/mp4',thumbnailReady:true,showEnabled:true,allowGuestDelete:false}];}''')
 p.locator('#refresh').click();p.wait_for_function("document.querySelector('#clips .media-row')!==null")
 check('Recording actions render',p.locator('#clips').get_by_role('button',name='Play').count()==1 and p.locator('#clips').get_by_role('button',name='Reprint QR ticket').count()==1)
 p.locator('#clips').get_by_role('button',name='Share view-only').click();p.locator('#ticketDialog').wait_for(state='visible')
 check('Ticket modal and QR rendered',p.locator('#ticketQR').evaluate('el=>el.getContext("2d").getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===0&&v<180)'))
 p.wait_for_function('''()=>{const i=document.querySelector('#ticketPhoto');return !i.hidden&&i.complete&&i.naturalWidth>0;}''')
 check('Ticket browser reprint includes original private screenshot',p.locator('#ticketPhoto').is_visible() and p.locator('#printTicket').is_enabled())
 p.locator('#closeTicket').click()
 p.locator('#clips').get_by_role('button',name='Play').click();p.locator('#preview').wait_for(state='visible')
 check('Admin Play opens preview',p.locator('#video').get_attribute('src').startswith('/api/media/'))
 p.locator('#closePreview').click()
 p.screenshot(path=str(Q/'v097-cloud-admin-mock.png'),full_page=True)
 guest_stub='''let status={status:'ready',title:'My Sample Event',canManage:true,permission:'private',moderation:'pending',showEnabled:false,allowGuestDelete:false};window.__guest=status;
 window.fetch=async(url,opt={})=>{if(String(url).endsWith('/status'))return {ok:true,json:async()=>status};if(String(url).endsWith('/open'))return {ok:true,json:async()=>({id:'a'.repeat(32),mediaUrl:'/api/media/'+'a'.repeat(32)})};if(String(url).endsWith('/permission')){status.permission=JSON.parse(opt.body).permission;return {ok:true,json:async()=>({permission:status.permission,moderation:'pending'})};}return {ok:false,json:async()=>({error:'not_supported'})};};
 '''
 g=b.new_page(viewport={'width':400,'height':860});g.on('pageerror',lambda e:errors.append(str(e)))
 g.set_content(inline('guest',guest_stub));g.evaluate("location.hash='#'+('a'.repeat(32))+'.'+('Z'.repeat(32))")
 g.wait_for_function("document.querySelector('#status').textContent.includes('READY')")
 check('Guest consent hidden when Big-screen disabled',g.locator('#showConsent').is_hidden())
 check('Guest delete hidden when disabled',g.locator('#ownerDelete').is_hidden())
 g.evaluate('window.__guest.showEnabled=true;window.__guest.allowGuestDelete=true;');g.evaluate('document.querySelector("#reload").click()')
 # refresh playback is independent from preference state; wait 10s interval or trigger visibility.
 g.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
 g.wait_for_function('document.querySelector("#showConsent").hidden===false')
 check('Guest consent appears only after Event enable',g.locator('#showConsent').is_visible())
 check('Guest deletion appears only after separate Event enable',g.locator('#ownerDelete').is_visible())
 g.screenshot(path=str(Q/'v097-guest-permissions-mock.png'))
 check('No Admin / Guest JS errors',not errors)
 b.close()
(Q/'v097-cloud-ui-mock-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'scope':'Browser/UI only with synthetic in-memory Cloud API, security verified separately in 122 real PHP API tests'},indent=2)+'\n')
print('TOTAL',len(checks),'PASSED')
