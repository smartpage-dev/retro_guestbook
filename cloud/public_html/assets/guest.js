'use strict';
(()=>{
 const $=id=>document.getElementById(id);let token=location.hash.slice(1),busy=false,playingId=null,openedAt=0,canDelete=false,canShow=false;
 function clearMedia(){$('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;$('downloads').hidden=true;playingId=null;}
 async function api(path,body){const identity=token;const r=await fetch('/api/guest/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+identity,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin',redirect:'error'});
  const data=await r.json();if(identity!==token)throw new Error('Link changed; old response discarded.');if(!r.ok)throw new Error(data.error||'Request failed; no change was confirmed.');return data;}
 async function playback(){const info=await api('open',{});$('video').src=info.mediaUrl;$('video').hidden=false;$('downloads').hidden=false;$('download').href=info.mediaUrl+'?download=1';playingId=info.id;openedAt=Date.now();}
 async function refresh(){if(busy)return;busy=true;try{
  if(!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(token))throw new Error('連結不完整，請重新掃描整個 QR Code。 / Incomplete link; scan the full ticket QR.');
  const s=await api('status');$('error').textContent='';$('eventTitle').textContent=s.title;
  if(s.status==='deleted'){clearMedia();$('waiting').hidden=true;$('privacy').hidden=true;$('viewOnly').hidden=true;
   $('status').textContent='已刪除 / DELETED · 網上存取已停止。 '+(s.devicePurgeAck?'本機清理已確認。 / Booth cleanup acknowledged.':'等待拍攝裝置清理。 / Awaiting booth cleanup.')+(s.purge==='pending'?' 雲端清理中。 / Cloud cleanup pending.':'');return;}
  const owner=s.canManage===true;canShow=owner&&s.showEnabled===true;canDelete=owner&&s.allowGuestDelete===true;
  $('showConsent').hidden=!canShow;$('ownerDelete').hidden=!canDelete;$('privacy').hidden=!(canShow||canDelete);$('viewOnly').hidden=owner;
  $('status').textContent=s.status==='ready'?'影片已準備好 / READY · PRIVATE RECORDING':'影片已保存；上傳中 / SAVED · UPLOAD PENDING';$('waiting').hidden=s.status==='ready';
  $('permissionText').textContent=s.permission==='allow'?'你已同意大屏幕播放 / Big screen allowed. Staff: '+s.moderation+'.':s.permission==='hidden'?'已設定只供私人觀看 / Kept private; not on event big screen.':'預設不會大屏幕播放 / Private by default; no show consent yet.';
  $('hide').disabled=s.permission==='hidden';$('allow').disabled=s.permission==='allow';
  if(s.status==='ready'&&(!playingId||Date.now()-openedAt>720000))await playback();
 }catch(e){$('error').textContent=e.message;if(/unauthorized|deleted|expired/.test(e.message))clearMedia();}finally{busy=false;}}
 async function permission(value){if(busy||!canShow)return;$('hide').disabled=true;$('allow').disabled=true;
  try{await api('permission',{permission:value});}catch(e){$('error').textContent='同意設定未確認 / Consent change not confirmed: '+e.message;}
  await refresh();}
 $('hide').onclick=()=>permission('hidden');$('allow').onclick=()=>permission('allow');
 $('reload').onclick=async()=>{if(busy)return;$('reload').disabled=true;try{await playback();$('error').textContent='已更新播放連線，原片不變。 / Playback renewed; recording unchanged.';}catch(e){$('error').textContent=e.message;}finally{$('reload').disabled=false;}};
 $('delete').onclick=()=>{if(!canDelete)return;$('deleteAck').checked=false;$('deleteConfirm').disabled=true;$('deleteError').textContent='';$('deleteDialog').showModal();};
 $('deleteCancel').onclick=()=>$('deleteDialog').close();$('deleteAck').onchange=()=>$('deleteConfirm').disabled=!$('deleteAck').checked;
 $('deleteConfirm').onclick=async()=>{if(!canDelete||!$('deleteAck').checked)return;$('deleteConfirm').disabled=true;$('deleteCancel').disabled=true;
  try{await api('delete',{confirm:'DELETE'});clearMedia();$('deleteDialog').close();await refresh();}catch(e){$('deleteError').textContent='刪除未確認 / Deletion not confirmed: '+e.message;$('deleteConfirm').disabled=false;}finally{$('deleteCancel').disabled=false;}};
 window.addEventListener('hashchange',()=>{token=location.hash.slice(1);clearMedia();$('privacy').hidden=true;$('viewOnly').hidden=true;$('eventTitle').textContent='你的一段私人回憶 / Your private moment.';$('status').textContent='核對連結中 / CHECKING LINK';if($('deleteDialog').open)$('deleteDialog').close();refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},10000);refresh();
})();
