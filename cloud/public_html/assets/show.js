'use strict';
(()=>{
 const $=id=>document.getElementById(id);let token=location.hash.slice(1),playlist=[],current=-1,loading=false,muted=true,previous='';
 async function api(path,body){const r=await fetch('/api/show/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',redirect:'error'});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Show request failed');return data;}
 async function fetchPlaylist(){if(!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(token)){status('Invalid or missing event show link.');return;}
  try{const data=await api('playlist');$('showEvent').textContent=data.event||'EVENT SCREEN';playlist=data.clips||[];
   if(!playlist.length){stop();$('showEmpty').hidden=false;status('No guest-consented and staff-approved clips yet.');return;}
   $('showEmpty').hidden=true;const previousId=previous;if(previousId&&!playlist.some(c=>c.id===previousId)){stop();await next();}
   else if(!$('showVideo').src || !previousId)await next();else status(`${playlist.length} approved video(s) · updating automatically`);
  }catch(e){stop();playlist=[];$('showEmpty').hidden=false;status('PRIVATE SHOW INACTIVE: '+e.message);}}
 function status(txt){$('showStatus').textContent=txt;}
 function stop(){const v=$('showVideo');v.pause();v.removeAttribute('src');v.load();previous='';current=-1;}
 async function next(){if(loading||!playlist.length)return;loading=true;const v=$('showVideo');
  try{current=(current+1)%playlist.length;const c=playlist[current];const data=await api('clip/'+c.id+'/open',{});previous=c.id;
   v.pause();v.src=data.mediaUrl;v.muted=muted;v.load();await v.play().catch(()=>status('Tap for sound / playback permission.'));
   status(`MESSAGE ${c.seq||current+1} · ${playlist.length} approved video(s)`);
  }catch(e){status('Clip not available: '+e.message);previous='';setTimeout(()=>{loading=false;next();},2500);return;}finally{loading=false;}}
 $('showVideo').addEventListener('ended',next);$('showVideo').addEventListener('error',()=>{status('Playback error, trying next approved clip.');setTimeout(next,1500);});
 $('sound').onclick=()=>{muted=!muted;$('showVideo').muted=muted;$('sound').textContent=muted?'Tap for sound':'Mute show';if(!muted)$('showVideo').play().catch(()=>{});};
 $('fullscreen').onclick=()=>{const el=document.documentElement;if(!document.fullscreenElement)el.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.();};
 window.addEventListener('hashchange',()=>{token=location.hash.slice(1);playlist=[];stop();fetchPlaylist();});
 setInterval(()=>{if(!document.hidden)fetchPlaylist();},10000);fetchPlaylist();
})();
