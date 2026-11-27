'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 let key='',events=[],active='',clips=[],devices=[],busy=false,page=0,showLink='',ticketLink='',thumbnailURLs=[],ticketPhotoURL='',ticketSerial=0;
 const PAGE_SIZE=24;
 const rowText=(el,txt)=>{el.textContent=txt;return el;};
 function message(text,error=false){$('message').textContent=text;$('message').dataset.error=error?'true':'false';}
 function releaseThumbnails(){for(const url of thumbnailURLs)URL.revokeObjectURL(url);thumbnailURLs=[];}
 function clearTicketPhoto(){ticketSerial++;if(ticketPhotoURL)URL.revokeObjectURL(ticketPhotoURL);ticketPhotoURL='';$('ticketPhoto').hidden=true;$('ticketPhoto').removeAttribute('src');$('ticketPhotoStatus').textContent='Screenshot not available for older clips.';}
 async function addTicketPhoto(c,requestSerial){
  try{
   if(!c.thumbnailReady)return;
   $('ticketPhotoStatus').textContent='Loading original ticket screenshot…';
   const identity=key;
   const r=await fetch('/api/admin/clip/'+c.id+'/thumbnail',{headers:{Authorization:'Bearer '+identity},credentials:'same-origin',cache:'no-store',redirect:'error'});
   if(identity!==key||ticketSerial!==requestSerial||!$('ticketDialog').open)return;
   if(!r.ok)throw new Error('Private screenshot not accessible');
   const b=await r.blob();if(b.type!=='image/jpeg'||b.size>262144)throw new Error('Screenshot not available');
   if(identity!==key||ticketSerial!==requestSerial||!$('ticketDialog').open)return;
   const url=URL.createObjectURL(b);ticketPhotoURL=url;
   $('ticketPhoto').src=url;$('ticketPhoto').hidden=false;
   $('ticketPhotoStatus').textContent='Original countdown screenshot';
  }catch{$('ticketPhotoStatus').textContent='No cloud screenshot; QR-only ticket remains printable.';}
  finally{if(ticketSerial===requestSerial)$('printTicket').disabled=false;}
 }
 function toggleControls(disabled){$('dashboard').setAttribute('aria-busy',String(disabled));
   document.querySelectorAll('#dashboard button').forEach(b=>b.disabled=disabled || b.dataset.locked==='true');}
 async function api(path,body){const identity=key;const r=await fetch('/api/admin/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+identity,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',redirect:'error'});
  let response;try{response=await r.json();}catch{throw new Error('Server did not return JSON.');}
  if(identity!==key)throw new Error('Admin session changed.');if(!r.ok)throw new Error(response.error||'Request failed; no change was confirmed.');return response;}
 async function run(button,action,success){if(busy)return;busy=true;const old=button?.textContent;if(button)button.textContent='Working…';
  toggleControls(true);message('Processing — please do not tap again.');
  try{await action();message(success||'Saved and confirmed by Cloud.');}
  catch(e){message('NOT CONFIRMED: '+e.message,true);console.warn('Admin request failed:',e.message);}
  finally{if(button)button.textContent=old;busy=false;toggleControls(false);syncLocked();}}
 function makeButton(label,task,style='secondary'){const b=document.createElement('button');b.className='btn '+style;b.type='button';b.textContent=label;b.onclick=()=>run(b,task,label+' completed.');return b;}
 const current=()=>events.find(e=>e.id===active);
 function syncLocked(){const has=!!current();for(const id of ['device','issueToggle','uploadToggle','showToggle','autoApproveToggle','deleteToggle','saveSettings','rotateShow']){
  const b=$(id);b.dataset.locked=has?'false':'true';b.disabled=busy||!has;
 }$('rotateShow').disabled=busy||!has||!current().showEnabled;
  if(!busy){const rows=filterClips(),last=Math.max(0,Math.ceil(rows.length/PAGE_SIZE)-1);$('prevPage').disabled=page===0;$('nextPage').disabled=page>=last;} }
 function markToggle(id,enabled,on,off){const b=$(id);b.textContent=(enabled?'ON · ':'OFF · ')+(enabled?on:off);b.setAttribute('aria-pressed',String(enabled));b.dataset.state=enabled?'on':'off';}
 function resetBundle(){$('bundle').value='';$('bundle').hidden=true;$('copyBundle').hidden=true;}
 function setSelection(){const select=$('event');select.replaceChildren();for(const e of events){const stamp=new Date(e.createdAt*1000).toLocaleDateString();select.append(new Option(`${e.title} · ${stamp} · ${e.id.slice(0,6)}`,e.id));}
  if(!events.some(e=>e.id===active))active=events[0]?.id||'';select.value=active;}
 function bindSettings(e){if(!e)return;const s=e.settings||{};const fields={settingTitle:s.title||e.title,settingDate:s.date,settingDuration:s.duration,settingCountdown:s.countdown,
  settingScreenStyle:s.screenStyle,settingLookMode:s.lookMode,settingAspect:s.ticketPhotoAspect,settingCapture:s.ticketCaptureSecond,
  settingQrSeconds:s.qrDisplaySeconds,settingReceiptStyle:s.receiptStyle,settingCaption:s.receiptCaption,settingFooter:s.receiptFooter,
  settingShowDelay:s.showDelay};for(const [id,value] of Object.entries(fields))if($(id)&&value!==undefined)$(id).value=value;
  $('revisionBadge').textContent='CLOUD REV '+(e.settingsRevision||1);$('settingsSaveMessage').textContent='Idle Android booths check Cloud for this revision.';}
 function bindPolicy(e){if(!e)return;markToggle('issueToggle',e.issueOpen,'Accepting NEW QR reservations','Reservations closed');
  markToggle('uploadToggle',e.uploadOpen,'Video uploads open','Uploads paused');
  markToggle('showToggle',e.showEnabled,'Big-screen enabled','Big-screen disabled');
  markToggle('autoApproveToggle',e.autoApproveShow,'Guest consent auto-approved','Staff approval required');
  markToggle('deleteToggle',e.allowGuestDelete,'Guest deletion enabled','Guest deletion disabled');
  $('showBadge').textContent=e.showEnabled?'ENABLED':'DISABLED';$('showBadge').dataset.state=e.showEnabled?'on':'off';
  $('showLinkMessage').textContent=e.showEnabled?'Private show link '+(e.showLinkIssued?'already issued; rotate to obtain a NEW link.':'not issued yet.'):'Guest big-screen consent is hidden and all show playback is denied.';
  $('openShow').hidden=!showLink||!e.showEnabled;syncLocked();}
 async function load({preserveForm=false}={}){const response=await api('events');events=response.events||[];setSelection();
  $('dashboard').hidden=false;$('login').hidden=true;$('eventBadge').textContent=current()?.title||'Create an event';
  if(!preserveForm)bindSettings(current());bindPolicy(current());
  if(!active){clips=[];devices=[];renderClips();$('devices').replaceChildren();return;}
  const [c,d]=await Promise.all([api('clips',{eventId:active}),api('devices')]);clips=c.clips||[];devices=(d.devices||[]).filter(device=>device.eventId===active);
  renderDevices();renderClips();$('lastRefresh').textContent='Last sync: '+new Date().toLocaleTimeString();}
 function renderDevices(){const root=$('devices');root.replaceChildren();$('deviceCount').textContent=devices.filter(d=>!d.revoked).length+' active / '+devices.length+' total';
  if(!devices.length){root.textContent='No connected devices. Create one bundle to pair your Android kiosk.';return;}
  for(const d of devices){const row=document.createElement('div');row.className='device-row';const text=document.createElement('span');text.textContent=d.label+' · '+(d.revoked?'REVOKED':'ACTIVE')+' · '+d.id.slice(0,8);row.append(text);
   if(!d.revoked)row.append(makeButton('Revoke device',async()=>{if(!confirm('This device will be disconnected and remaining uploads stopped. Continue?'))return;await api('device/'+d.id+'/revoke',{});await load();},'danger'));
   root.append(row);}}
 function filterClips(){const type=$('clipFilter').value,query=$('clipSearch').value.trim().toLowerCase();return [...clips].reverse().filter(c=>{
  if(type==='ready'&&c.status!=='ready')return false;
  if(type==='reserved'&&!['reserved','uploading'].includes(c.status))return false;
  if(type==='deleted'&&c.status!=='deleted')return false;
  return !query||String(c.seq||'').includes(query)||c.id.includes(query);
 });}
 async function fetchThumbnail(id,img){try{const identity=key;const r=await fetch('/api/admin/clip/'+id+'/thumbnail',{headers:{Authorization:'Bearer '+identity},credentials:'same-origin',cache:'no-store',redirect:'error'});if(!r.ok||identity!==key)return;
  const b=await r.blob();if(b.type!=='image/jpeg'||b.size>262144||!img.isConnected)return;const url=URL.createObjectURL(b);thumbnailURLs.push(url);img.src=url;img.alt='Ticket screenshot / '+id.slice(0,8);
 }catch{}}
 function renderClips(){releaseThumbnails();const root=$('clips');root.replaceChildren();const all=filterClips();const totalPages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));page=Math.max(0,Math.min(page,totalPages-1));
  const counts=clips.reduce((acc,c)=>(acc[c.status]=(acc[c.status]||0)+1,acc),{});
  $('clipCounts').textContent=`${counts.ready||0} ready · ${counts.reserved||0} reserved · ${counts.uploading||0} uploading · ${counts.deleted||0} deleted`;
  $('pageStatus').textContent=all.length?`Page ${page+1} of ${totalPages} · ${all.length} matches`:'No matching recordings';$('prevPage').disabled=busy||page===0;$('nextPage').disabled=busy||page>=totalPages-1;
  if(!all.length){const empty=document.createElement('p');empty.className='notice';empty.textContent='No recordings match. Choose All to inspect reserved links or uploads.';root.append(empty);return;}
  for(const c of all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){
   const row=document.createElement('div');row.className='clip-row media-row';const img=document.createElement('img');img.className='clip-thumb';img.alt='No screenshot uploaded yet';
   if(c.status==='ready'&&c.thumbnailReady)fetchThumbnail(c.id,img);else img.classList.add('placeholder');
   const content=document.createElement('div');content.className='clip-info';const title=document.createElement('strong');title.textContent=c.seq?'Message '+String(c.seq).padStart(3,'0'):'Reserved '+c.id.slice(0,8);
   const state=document.createElement('div');state.className='state-chip';state.dataset.state=c.status==='ready'?'on':'off';state.textContent=c.status.toUpperCase();
   const details=document.createElement('p');details.textContent=`Guest: ${c.permission} · Staff: ${c.moderation} · ${new Date(c.createdAt*1000).toLocaleString()}`;
   content.append(title,state,details);const buttons=document.createElement('div');buttons.className='row actions';
   if(c.status==='ready'){
    buttons.append(makeButton('Play',()=>openClip(c)));
    buttons.append(makeButton('Download',()=>downloadClip(c)));
    buttons.append(makeButton('Share view-only',()=>openTicket(c,false)));
    buttons.append(makeButton('Reprint QR ticket',()=>openTicket(c,true)));
   }
   if(c.status!=='deleted'){
    if(current()?.showEnabled&&c.status==='ready')buttons.append(makeButton(c.moderation==='approved'?'Revoke show approval':'Approve for show',async()=>{await api('clip/'+c.id+'/moderate',{approved:c.moderation!=='approved'});await load();}));
    buttons.append(makeButton('Delete…',async()=>{if(prompt('Permanent cloud deletion, and booth cleanup when online. Type DELETE to confirm:')!=='DELETE')return;
     await api('clip/'+c.id+'/delete',{confirm:'DELETE'});await load();},'danger'));
   }
   row.append(img,content,buttons);root.append(row);
  }}
 async function openClip(c){const r=await api('clip/'+c.id+'/open',{});$('video').src=r.mediaUrl;$('previewDownload').href=r.mediaUrl+'?download=1';$('previewDownload').download='RetroBooth_'+c.id+'.mp4';$('preview').showModal();}
 async function downloadClip(c){const r=await api('clip/'+c.id+'/open',{});const a=document.createElement('a');a.href=r.mediaUrl+'?download=1';a.download='RetroBooth_'+c.id;document.body.append(a);a.click();a.remove();}
 function drawQR(canvas,payload){const q=new RetroQR(0,0);q.addData(payload);q.make();const count=q.getModuleCount(),quiet=4,unit=Math.max(2,Math.floor(canvas.width/(count+2*quiet)));
  const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.fillStyle='#000';const offset=Math.floor((canvas.width-unit*(count+quiet*2))/2);
  for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(q.isDark(y,x))g.fillRect(offset+(x+quiet)*unit,offset+(y+quiet)*unit,unit,unit);}
 async function openTicket(c,print){const data=await api('clip/'+c.id+'/share',{});ticketLink=data.viewOnlyUrl;
  clearTicketPhoto();const serial=ticketSerial;
  $('ticketEvent').textContent=current()?.title||'Event recording';$('ticketExpiry').textContent='VIEW-ONLY · Expires '+new Date(data.expiresAt*1000).toLocaleDateString();
  drawQR($('ticketQR'),ticketLink);$('printTicket').disabled=!!c.thumbnailReady;$('ticketDialog').showModal();
  await addTicketPhoto(c,serial);
  if(print)message('Ticket ready. Use browser Print; it does NOT contact the Android Bluetooth printer.');}
 function closeVideo(){$('video').pause();$('video').removeAttribute('src');$('video').load();$('previewDownload').removeAttribute('href');if($('preview').open)$('preview').close();}
 $('loginBtn').onclick=()=>run($('loginBtn'),async()=>{key=$('adminKey').value.trim();await load();$('adminKey').value='';},'Signed in.');
 $('logout').onclick=()=>{if(busy)return;key='';events=[];clips=[];active='';showLink='';ticketLink='';releaseThumbnails();resetBundle();closeVideo();if($('ticketDialog').open)$('ticketDialog').close();clearTicketPhoto();
  $('ticketQR').getContext('2d').clearRect(0,0,$('ticketQR').width,$('ticketQR').height);
  $('clips').replaceChildren();$('devices').replaceChildren();$('event').replaceChildren();$('clipCounts').textContent='0 clips';
  $('openShow').hidden=true;$('openShow').removeAttribute('href');$('lastRefresh').textContent='';
  $('dashboard').hidden=true;$('login').hidden=false;message('Signed out of this tab.');};
 $('refresh').onclick=()=>run($('refresh'),()=>load(),'Cloud refreshed; no changes were made.');
 $('event').onchange=()=>{if(busy)return;active=$('event').value;showLink='';page=0;resetBundle();run(null,()=>load(),'Selected event loaded.');};
 $('create').onclick=()=>run($('create'),async()=>{const name=$('title').value.trim();if(!name)throw new Error('Enter an event name.');const same=events.find(e=>e.title.trim().toLowerCase()===name.toLowerCase()&&e.expiresAt>Date.now()/1000);
  if(same){active=same.id;await load();throw new Error('This event already exists. Selected the existing event instead — no duplicate created.');}
  const e=await api('events',{title:name,days:Number($('days').value)});active=e.id;await load();$('title').value='';},'New event created once.');
 $('device').onclick=()=>run($('device'),async()=>{if(!active)throw new Error('Select an event first.');const label=$('deviceLabel').value.trim()||'Booth';if(devices.some(d=>!d.revoked&&d.label===label)&&!confirm('An active device with this label already exists. Create another device identity?'))return;
  const b=await api('device',{eventId:active,label});$('bundle').value=JSON.stringify(b,null,2);$('bundle').hidden=false;$('copyBundle').hidden=false;await load();},'Device created. Copy the secret bundle once, then pair your Android.');
 $('copyBundle').onclick=()=>run($('copyBundle'),async()=>{await navigator.clipboard.writeText($('bundle').value);},'Device bundle copied. Do not post it publicly.');
 $('eventSettingsForm').onsubmit=e=>{e.preventDefault();run($('saveSettings'),async()=>{const currentEvent=current();if(!currentEvent)throw new Error('Select an event first.');
  const settings={title:$('settingTitle').value,date:$('settingDate').value,duration:Number($('settingDuration').value),countdown:Number($('settingCountdown').value),screenStyle:$('settingScreenStyle').value,lookMode:$('settingLookMode').value,
   ticketPhotoAspect:$('settingAspect').value,ticketCaptureSecond:Number($('settingCapture').value),qrDisplaySeconds:Number($('settingQrSeconds').value),receiptStyle:$('settingReceiptStyle').value,
   receiptCaption:$('settingCaption').value,receiptFooter:$('settingFooter').value,showDelay:Number($('settingShowDelay').value)};
  await api('event/'+active+'/settings',{expectedRevision:currentEvent.settingsRevision||1,settings});await load();$('settingsSaveMessage').textContent='Saved to Cloud; next idle Android sync will apply this revision.';
 },'Event settings saved and versioned in Cloud.');};
 for(const [id,name] of [['issueToggle','issueOpen'],['uploadToggle','uploadOpen'],['showToggle','showEnabled'],['autoApproveToggle','autoApproveShow'],['deleteToggle','allowGuestDelete']]){
  $(id).onclick=()=>run($(id),async()=>{const e=current();if(!e)return;await api('event/'+active,{[name]:!e[name]});await load();},'Event permission updated.');
 }
 $('rotateShow').onclick=()=>run($('rotateShow'),async()=>{if(!confirm('Generate a NEW private slideshow URL? Any previously issued show URL will stop working.'))return;
  const out=await api('event/'+active+'/slideshow',{confirm:'ROTATE'});showLink=out.showUrl;$('openShow').href=showLink;$('openShow').hidden=false;await load();},'New private slideshow link created. Save it before closing this tab.');
 $('clipFilter').onchange=()=>{page=0;renderClips();};$('clipSearch').oninput=()=>{page=0;renderClips();};
 $('prevPage').onclick=()=>{if(page>0){page--;renderClips();}};$('nextPage').onclick=()=>{if(page*PAGE_SIZE+PAGE_SIZE<filterClips().length){page++;renderClips();}};
 $('closePreview').onclick=closeVideo;$('preview').addEventListener('close',closeVideo);
 $('closeTicket').onclick=()=>{$('ticketDialog').close();ticketLink='';clearTicketPhoto();};$('ticketDialog').addEventListener('close',()=>{ticketLink='';clearTicketPhoto();});$('copyTicket').onclick=()=>run($('copyTicket'),()=>navigator.clipboard.writeText(ticketLink),'View-only link copied.');
 $('printTicket').onclick=()=>{if(!ticketLink)return;window.print();};
})();
