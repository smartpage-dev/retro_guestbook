'use strict';
(()=>{
 const $=id=>document.getElementById(id);let token=location.hash.slice(1),busy=false,playingId=null,openedAt=0,canDelete=false,canShow=false;
 function clearMedia(){$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('downloads').hidden=true;playingId=null;}
 async function api(path,body){const identity=token;const r=await fetch('/api/guest/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+identity,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin',redirect:'error'});
  const data=await r.json();if(identity!==token)throw new Error('Link changed; old response discarded.');if(!r.ok)throw new Error(data.error||'Request failed; no change was confirmed.');return data;}
 async function playback(){const info=await api('open',{});$('video').src=info.mediaUrl;$('video').hidden=false;$('downloads').hidden=false;$('download').href=info.mediaUrl+'?download=1';playingId=info.id;openedAt=Date.now();}
 async function refresh(){if(busy)return;busy=true;try{
  if(!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(token))throw new Error('This link is incomplete. Scan the full ticket QR code.');
  const s=await api('status');$('error').textContent='';$('eventTitle').textContent=s.title;
  if(s.status==='deleted'){clearMedia();$('waiting').hidden=true;$('privacy').hidden=true;$('viewOnly').hidden=true;
   $('status').textContent='DELETED / Online access revoked. '+(s.devicePurgeAck?'Booth cleanup acknowledged.':'Waiting for booth cleanup.')+(s.purge==='pending'?' Cloud cleanup pending.':'');return;}
  const owner=s.canManage===true;canShow=owner&&s.showEnabled===true;canDelete=owner&&s.allowGuestDelete===true;
  $('showConsent').hidden=!canShow;$('ownerDelete').hidden=!canDelete;$('privacy').hidden=!(canShow||canDelete);$('viewOnly').hidden=owner;
  $('status').textContent=s.status==='ready'?'READY / PRIVATE RECORDING':'SAVED AT BOOTH / UPLOAD PENDING';$('waiting').hidden=s.status==='ready';
  $('permissionText').textContent=s.permission==='allow'?'You allowed the event screen. Staff approval: '+s.moderation+'.':s.permission==='hidden'?'Kept off the event screen; private video is safe.':'Private by default. Not yet allowed for the event screen.';
  $('hide').disabled=s.permission==='hidden';$('allow').disabled=s.permission==='allow';
  if(s.status==='ready'&&(!playingId||Date.now()-openedAt>720000))await playback();
 }catch(e){$('error').textContent=e.message;if(/unauthorized|deleted|expired/.test(e.message))clearMedia();}finally{busy=false;}}
 async function permission(value){if(busy||!canShow)return;$('hide').disabled=true;$('allow').disabled=true;
  try{await api('permission',{permission:value});}catch(e){$('error').textContent='Consent change not confirmed: '+e.message;}
  await refresh();}
 $('hide').onclick=()=>permission('hidden');$('allow').onclick=()=>permission('allow');
 $('reload').onclick=async()=>{if(busy)return;$('reload').disabled=true;try{await playback();$('error').textContent='Playback session refreshed; original recording unchanged.';}catch(e){$('error').textContent=e.message;}finally{$('reload').disabled=false;}};
 $('delete').onclick=()=>{if(!canDelete)return;$('deleteAck').checked=false;$('deleteConfirm').disabled=true;$('deleteError').textContent='';$('deleteDialog').showModal();};
 $('deleteCancel').onclick=()=>$('deleteDialog').close();$('deleteAck').onchange=()=>$('deleteConfirm').disabled=!$('deleteAck').checked;
 $('deleteConfirm').onclick=async()=>{if(!canDelete||!$('deleteAck').checked)return;$('deleteConfirm').disabled=true;$('deleteCancel').disabled=true;
  try{await api('delete',{confirm:'DELETE'});clearMedia();$('deleteDialog').close();await refresh();}catch(e){$('deleteError').textContent='Deletion not confirmed: '+e.message;$('deleteConfirm').disabled=false;}finally{$('deleteCancel').disabled=false;}};
 window.addEventListener('hashchange',()=>{token=location.hash.slice(1);clearMedia();$('privacy').hidden=true;$('viewOnly').hidden=true;$('eventTitle').textContent='Your private moment.';$('status').textContent='CHECKING LINK';if($('deleteDialog').open)$('deleteDialog').close();refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},10000);refresh();
})();
