'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 let token=new URLSearchParams(location.search).get('token')||'';
 // The token is never placed in a download URL, DOM href, localStorage or cookie readable by JS.
 if(location.search)history.replaceState(null,'',location.pathname);
 function error(text){$('status').textContent=text;$('downloads').replaceChildren();$('eventTitle').textContent='Your memories, kept together.';$('pastePanel').hidden=false;}
 function format(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';}
 async function load(){
  if(!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(token)){error('Invalid or missing private share link.');return;}
  $('status').textContent='Authorizing private event download...';
  try{
   const auth={'Authorization':'Bearer '+token};
   const response=await fetch('/api/client/status',{headers:auth,credentials:'same-origin',cache:'no-store'});
   const status=await response.json();if(!response.ok)throw Error(status.error||'Share not available');
   const grant=await fetch('/api/client/authorize',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{}',credentials:'same-origin',cache:'no-store'});
   const g=await grant.json();if(!grant.ok||!g.authorized)throw Error(g.error||'Not authorized');
   // API credential is retained in JS memory only, not in a link or persistent storage.
   $('eventTitle').textContent=status.eventTitle;
   $('downloads').replaceChildren();
   for(const part of status.parts){
    const row=document.createElement('div');row.className='download-entry';
    const label=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('p');
    strong.textContent='ZIP Part '+part.part+' / '+status.parts.length;
    small.className='hint';small.textContent=part.count+' video(s) · '+format(part.bytes);label.append(strong,small);
    const a=document.createElement('a');a.className='btn';a.textContent='Download ZIP';a.href='/api/client/zip/'+token.slice(0,32)+'/'+part.part;a.rel='noreferrer';
    row.append(label,a);$('downloads').append(row);
   }
   $('status').textContent=status.count+' event videos ready · '+status.parts.length+' ZIP file(s) · '+format(status.bytes)+' of video.';
   $('pastePanel').hidden=true;
  }catch(e){error('Cannot open this share: '+e.message);}
 }
 $('open').onclick=()=>{token=$('accessToken').value.trim();$('accessToken').value='';load();};load();
})();
