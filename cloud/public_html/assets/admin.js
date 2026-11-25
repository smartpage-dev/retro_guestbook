'use strict';
(()=>{
 const $=id=>document.getElementById(id);let key='',events=[],active='';
 const pretty=n=>n>=1048576?(n/1048576).toFixed(1)+' MiB':Math.ceil(n/1024)+' KiB';
 async function api(path,body){const identity=key;const r=await fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',redirect:'error'});const d=await r.json();if(identity!==key)throw new Error('Admin session changed; old response discarded.');if(!r.ok)throw new Error(d.error||'Request failed');return d;}
 async function action(fn){$('message').textContent='Working...';try{await fn();if($('message').textContent==='Working...')$('message').textContent='Updated.';}catch(e){$('message').textContent=e.message;}}
 function button(text,fn,danger=false){const b=document.createElement('button');b.className='btn '+(danger?'danger':'secondary');b.textContent=text;b.onclick=()=>action(fn);return b;}
 async function refreshArchive(){
  if(!active)return;
  const a=await api('event/'+active+'/archive');
  $('archiveStatus').textContent=a.status.toUpperCase()+' · '+(a.count||0)+' videos · '+pretty(a.bytes||0)+' source video'+(a.parts?.length?' · '+a.parts.length+' independent ZIP file(s)':'')+(a.error?' · '+a.error:'')+(a.shareActive?' · client link active until '+new Date(a.shareExpiresAt*1000).toLocaleString():' · no active client link');
  $('archiveLink').disabled=a.status!=='ready';
  $('archiveCopy').disabled=!$('archiveUrl').value;
  $('archivePrepare').disabled=false; // Explicit new Prepare can recover an abandoned 'building' state after the old worker is stopped.
 }
 async function load(){
  const answer=await api('events');events=answer.events;const select=$('event');select.replaceChildren();for(const e of events)select.append(new Option(e.title,e.id));if(events.some(e=>e.id===active))select.value=active;else active=select.value;
  $('dashboard').hidden=false;$('login').hidden=true;
  if(!active){$('clips').textContent='Create your first event.';$('archiveStatus').textContent='Create your first event.';return;}
  const event=events.find(e=>e.id===active);$('renameEvent').value=event.title;$('issueToggle').textContent=event.issueOpen?'Close NEW QR reservations':'Open NEW QR reservations';$('uploadToggle').textContent=event.uploadOpen?'Pause upload drain':'Resume upload drain';
  const clips=(await api('clips',{eventId:active})).clips;$('clips').replaceChildren();
  const ready=clips.filter(c=>c.status==='ready'),waiting=clips.filter(c=>c.status==='uploading').length;
  $('eventOverview').textContent='Event '+active+' · '+ready.length+' verified video(s) · '+waiting+' uploading · '+pretty(ready.reduce((n,c)=>n+(c.size||0),0))+' ready video · expires '+new Date(event.expiresAt*1000).toLocaleDateString();
  await refreshArchive();
  if(!clips.length)$('clips').textContent='No reserved links or recordings yet.';
  for(const c of [...clips].reverse()){
   const row=document.createElement('div');row.className='clip-row';const content=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=c.seq?'Message '+c.seq:'Reserved '+c.id.slice(0,8);detail.textContent=c.status+' / guest: '+c.permission+' / staff: '+c.moderation+(c.status==='deleted'?' / booth cleanup: '+(c.devicePurgeAck?'acknowledged':'pending'):'');content.append(title,detail);row.append(content);const controls=document.createElement('div');controls.className='row';
   if(c.status==='ready')controls.append(button('Preview',async()=>{const m=await api('clip/'+c.id+'/open',{});$('video').src=m.mediaUrl;$('preview').showModal();}));
   if(c.status!=='deleted'){
    controls.append(button(c.moderation==='approved'?'Revoke approval':'Approve for show',async()=>{await api('clip/'+c.id+'/moderate',{approved:c.moderation!=='approved'});await load();}));
    controls.append(button('Delete...',async()=>{if(prompt('Permanently revoke this recording? Type DELETE to confirm. Downloaded copies cannot be recalled.')!=='DELETE')return;await api('clip/'+c.id+'/delete',{confirm:'DELETE'});await load();},true));
   }row.append(controls);$('clips').append(row);
  }
  const devices=(await api('devices')).devices.filter(d=>d.eventId===active);$('devices').replaceChildren();for(const d of devices){const row=document.createElement('div');row.className='clip-row';const text=document.createElement('span');text.textContent=d.label+' / '+(d.revoked?'revoked':'active');row.append(text);if(!d.revoked)row.append(button('Revoke device',async()=>{if(!confirm('Revoke this device? It will no longer upload or acknowledge deletions.'))return;await api('device/'+d.id+'/revoke',{});await load();},true));$('devices').append(row);}
 }
 $('loginBtn').onclick=()=>action(async()=>{key=$('adminKey').value.trim();await load();$('adminKey').value='';});$('logout').onclick=()=>{key='';$('dashboard').hidden=true;$('login').hidden=false;$('bundle').value='';$('adminKey').value='';$('clips').replaceChildren();$('devices').replaceChildren();$('archiveUrl').value='';$('archiveStatus').textContent='Signed out';$('video').pause();$('video').removeAttribute('src');$('video').load();if($('preview').open)$('preview').close();$('message').textContent='Admin key cleared from this page. Existing media grants expire within 15 minutes.';};
 $('create').onclick=()=>action(async()=>{const e=await api('events',{title:$('title').value,days:Number($('days').value)});active=e.id;await load();});$('event').onchange=()=>action(async()=>{active=$('event').value;$('bundle').hidden=true;$('bundle').value='';$('copyBundle').hidden=true;$('archiveUrl').value='';await load();});
 $('device').onclick=()=>action(async()=>{if(!active)throw new Error('Create an event first.');const b=await api('device',{eventId:active,label:$('deviceLabel').value});$('bundle').value=JSON.stringify(b,null,2);$('bundle').hidden=false;$('copyBundle').hidden=false;await load();});
 $('copyBundle').onclick=()=>action(()=>navigator.clipboard.writeText($('bundle').value));$('refresh').onclick=()=>action(load);
 for(const [id,field] of [['issueToggle','issueOpen'],['uploadToggle','uploadOpen']])$(id).onclick=()=>action(async()=>{const e=events.find(e=>e.id===active);if(!e)return;await api('event/'+active,{[field]:!e[field]});await load();});
 $('saveEventName').onclick=()=>action(async()=>{if(!active)return;await api('event/'+active,{title:$('renameEvent').value.trim()});await load();});
 $('archiveRefresh').onclick=()=>action(refreshArchive);
 $('archivePrepare').onclick=()=>action(async()=>{
  if(!active)throw new Error('Select an event first.');
  if(!confirm('Prepare an archive of ALL verified videos, including hidden/private recordings? This revokes any existing share link. Confirm that guests consent to organiser delivery and that uploads are finished.'))return;
  await api('event/'+active+'/archive',{action:'prepare',confirm:'SHARE_ALL_READY'});$('archiveUrl').value='';await refreshArchive();
  $('message').textContent='ZIP preparation queued. Run the Hostinger private PHP archive worker and then Refresh ZIP status.';
 });
 $('archiveLink').onclick=()=>action(async()=>{
  if(!active||!confirm('Create a NEW client link? Previously shared links and their browser download authorizations will be revoked.'))return;
  const a=await api('event/'+active+'/archive',{action:'create-link',confirm:'SHARE_ALL_READY',days:Number($('shareDays').value)});
  $('archiveUrl').value=a.shareUrl;await refreshArchive();$('archiveUrl').focus();
 });
 $('archiveCopy').onclick=()=>action(async()=>{if(!$('archiveUrl').value)throw new Error('Create a share link first.');await navigator.clipboard.writeText($('archiveUrl').value);});
 $('archiveRevoke').onclick=()=>action(async()=>{if(!active||!confirm('Revoke the client share link now? Already downloaded copies cannot be recalled.'))return;await api('event/'+active+'/archive',{action:'revoke'});$('archiveUrl').value='';await refreshArchive();});
 $('closePreview').onclick=()=>{$('video').pause();$('video').removeAttribute('src');$('video').load();$('preview').close();};$('preview').addEventListener('close',()=>{$('video').pause();$('video').removeAttribute('src');$('video').load();});
})();
