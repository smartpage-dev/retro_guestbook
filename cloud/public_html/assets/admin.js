'use strict';
(()=>{
 const $=id=>document.getElementById(id);let key='',events=[],active='';
 async function api(path,body){const identity=key;const r=await fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',redirect:'error'});const d=await r.json();if(identity!==key)throw new Error('Admin session changed; old response discarded.');if(!r.ok)throw new Error(d.error||'Request failed');return d;}
 async function action(fn){try{await fn();$('message').textContent='Updated.';}catch(e){$('message').textContent=e.message;}}
 function button(text,fn,danger=false){const b=document.createElement('button');b.className='btn '+(danger?'danger':'secondary');b.textContent=text;b.onclick=()=>action(fn);return b;}
 async function load(){
  const answer=await api('events');events=answer.events;const select=$('event');select.replaceChildren();for(const e of events)select.append(new Option(e.title,e.id));if(events.some(e=>e.id===active))select.value=active;else active=select.value;
  $('dashboard').hidden=false;$('login').hidden=true;
  if(!active){$('clips').textContent='Create your first event.';return;}
  const event=events.find(e=>e.id===active);$('issueToggle').textContent=event.issueOpen?'Close NEW QR reservations':'Open NEW QR reservations';$('uploadToggle').textContent=event.uploadOpen?'Pause upload drain':'Resume upload drain';
  const clips=(await api('clips',{eventId:active})).clips;$('clips').replaceChildren();
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
 $('loginBtn').onclick=()=>action(async()=>{key=$('adminKey').value.trim();await load();$('adminKey').value='';});$('logout').onclick=()=>{key='';$('dashboard').hidden=true;$('login').hidden=false;$('bundle').value='';$('adminKey').value='';$('clips').replaceChildren();$('devices').replaceChildren();$('video').pause();$('video').removeAttribute('src');$('video').load();if($('preview').open)$('preview').close();$('message').textContent='Admin key cleared from this page. Existing media grants expire within 15 minutes.';};
 $('create').onclick=()=>action(async()=>{const e=await api('events',{title:$('title').value,days:Number($('days').value)});active=e.id;await load();});$('event').onchange=()=>action(async()=>{active=$('event').value;$('bundle').hidden=true;$('bundle').value='';$('copyBundle').hidden=true;await load();});
 $('device').onclick=()=>action(async()=>{if(!active)throw new Error('Create an event first.');const b=await api('device',{eventId:active,label:$('deviceLabel').value});$('bundle').value=JSON.stringify(b,null,2);$('bundle').hidden=false;$('copyBundle').hidden=false;await load();});
 $('copyBundle').onclick=()=>action(()=>navigator.clipboard.writeText($('bundle').value));$('refresh').onclick=()=>action(load);
 for(const [id,field] of [['issueToggle','issueOpen'],['uploadToggle','uploadOpen']])$(id).onclick=()=>action(async()=>{const e=events.find(e=>e.id===active);if(!e)return;await api('event/'+active,{[field]:!e[field]});await load();});
 $('closePreview').onclick=()=>{$('video').pause();$('video').removeAttribute('src');$('video').load();$('preview').close();};$('preview').addEventListener('close',()=>{$('video').pause();$('video').removeAttribute('src');$('video').load();});
})();
