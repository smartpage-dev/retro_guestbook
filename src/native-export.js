/* Optional Android export bridge; scoped by the native host to its bundled origin. */
let nativeExportBusy=false;
async function exportToAndroid(blob,name){
 if(nativeExportBusy)throw new Error('Another export is active. Finish or cancel the Android save dialog first.');
 nativeExportBusy=true;const id=C.randomId();let waiter=null;
 const call=(type,data={})=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{waiter=null;reject(new Error('Android export timed out.'));},120000);
  waiter={resolve:v=>{clearTimeout(timer);waiter=null;resolve(v);},reject:e=>{clearTimeout(timer);waiter=null;reject(e);}};
  try{window.RetroNative.postMessage(JSON.stringify({id,type,...data}));}catch(e){waiter.reject(e);}
 });
 const receive=e=>{try{const m=JSON.parse(e.data);if(m.id!==id||!waiter)return;if(m.error)waiter.reject(new Error(m.error));else waiter.resolve(m);}catch{}};
 const previous=window.RetroNative.onmessage;window.RetroNative.onmessage=receive;
 try{
  const hash=crypto.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''):'';
  await call('begin',{name,mime:blob.type||'application/octet-stream',size:blob.size,sha256:hash});
  for(let offset=0,index=0;offset<blob.size;offset+=49152,index++){
   const bytes=new Uint8Array(await blob.slice(offset,offset+49152).arrayBuffer());let text='';for(const n of bytes)text+=String.fromCharCode(n);
   await call('chunk',{index,base64:btoa(text)});
  }
  const result=await call('finish');if(result.bytes!==blob.size)throw new Error('Export length mismatch.');
  toast('Export complete. Keep this independent copy; browser storage is not a backup.');
 }catch(e){try{window.RetroNative.postMessage(JSON.stringify({id,type:'abort'}));}catch{}throw e;}
 finally{window.RetroNative.onmessage=previous;nativeExportBusy=false;}
}
