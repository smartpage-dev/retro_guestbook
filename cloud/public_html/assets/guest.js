'use strict';
(()=>{
 const $=id=>document.getElementById(id);let token=location.hash.slice(1),busy=false,playingId=null,openedAt=0;
 function clearMedia(){$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('downloads').hidden=true;playingId=null;}
 async function api(path,body){const identity=token;const r=await fetch('/api/guest/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin',redirect:'error'});const data=await r.json();if(identity!==token)throw new Error('Link changed; old response discarded.');if(!r.ok)throw new Error(data.error||'Request failed. No change was confirmed.');return data;}
 async function playback(){const g=await api('open',{});$('video').src=g.mediaUrl;$('video').hidden=false;$('downloads').hidden=false;$('download').href=g.mediaUrl+'?download=1';playingId=g.id;openedAt=Date.now();}
 async function refresh(){
  if(busy)return;busy=true;
  try{
   if(!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(token))throw new Error('This link is incomplete. Scan the full receipt QR.');
   const s=await api('status');$('error').textContent='';$('eventTitle').textContent=s.title;
   if(s.status==='deleted'){
    clearMedia();$('waiting').hidden=true;$('privacy').hidden=true;$('viewOnly').hidden=true;
    $('status').textContent='DELETED / Online access revoked. '+(s.devicePurgeAck?'Booth local cleanup acknowledged.':'Waiting for the booth to reconnect and remove its local copy.')+(s.purge==='pending'?' Cloud file cleanup pending.':'');return;
   }
   $('status').textContent=s.status==='ready'?'READY / PRIVATE RECORDING':'SAVED AT BOOTH / UPLOAD PENDING';$('waiting').hidden=s.status==='ready';
   $('privacy').hidden=!s.canManage;$('viewOnly').hidden=s.canManage;
   $('permissionText').textContent=s.permission==='allow'?'You have allowed big-screen use. Staff approval: '+s.moderation+'.':s.permission==='hidden'?'Hidden from live show. Your private recording is kept.':'Private by default. Not allowed for live show.';
   $('hide').disabled=s.permission==='hidden';$('allow').disabled=s.permission==='allow';
   if(s.status==='ready'&&(!playingId||Date.now()-openedAt>720000))await playback();
  }catch(e){$('error').textContent=e.message;if(/unauthorized|deleted|expired/.test(e.message))clearMedia();}finally{busy=false;}
 }
 async function permission(value){$('hide').disabled=$('allow').disabled=true;try{await api('permission',{permission:value});}catch(e){$('error').textContent=e.message;}await refresh();}
 $('hide').onclick=()=>permission('hidden');$('allow').onclick=()=>permission('allow');$('reload').onclick=()=>playback().catch(e=>$('error').textContent=e.message);
 $('delete').onclick=()=>{$('deleteAck').checked=false;$('deleteConfirm').disabled=true;$('deleteError').textContent='';$('deleteDialog').showModal();};
 $('deleteCancel').onclick=()=>$('deleteDialog').close();$('deleteAck').onchange=()=>$('deleteConfirm').disabled=!$('deleteAck').checked;
 $('deleteConfirm').onclick=async()=>{if(!$('deleteAck').checked)return;$('deleteConfirm').disabled=true;$('deleteCancel').disabled=true;try{await api('delete',{confirm:'DELETE'});clearMedia();$('deleteDialog').close();await refresh();}catch(e){$('deleteError').textContent='Deletion not confirmed: '+e.message;$('deleteConfirm').disabled=false;}finally{$('deleteCancel').disabled=false;}};
 window.addEventListener('hashchange',()=>{token=location.hash.slice(1);clearMedia();$('privacy').hidden=true;$('viewOnly').hidden=true;$('eventTitle').textContent='Your private moment.';$('status').textContent='CHECKING LINK';if($('deleteDialog').open)$('deleteDialog').close();refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},10000);refresh();
})();
