const test=require('node:test');
const assert=require('node:assert/strict');
const cryptoNode=require('node:crypto');
const {RetroBackupClient,fileNameFor,isSaved,key}=require('../src/backup-client.js');

function clip(content='guest memory',id='a'.repeat(32),seq=7){
 const bytes=Buffer.from(content);
 return {id,seq,kind:'real',lifecycle:'active',createdAt:'2026-11-28T19:30:45.000Z',
  blob:new Blob([bytes],{type:'video/webm'}),mime:'video/webm',sha256:cryptoNode.createHash('sha256').update(bytes).digest('hex')};
}
function mockNative(){
 const calls=[],files=new Map();let selected=false,enabled=false,connected=true,transfers=new Map();let corrupt=false;
 const bridge={onmessage:null, postMessage(payload){
  const m=JSON.parse(payload);calls.push(m);let result={id:m.id};
  try{
   const available=()=>{if(!selected||!enabled||!connected)throw Error('USB unavailable');};
   switch(m.op){
    case 'status':result={...result,available:true,configured:selected,enabled,ready:connected&&selected,folderKey:'usb-volume-1',folderName:'Client Videos'};break;
    case 'select':selected=true;enabled=true;result={...result,available:true,configured:true,enabled:true,ready:true,folderKey:'usb-volume-1',folderName:'Client Videos'};break;
    case 'enable':enabled=true;break;
    case 'pause':enabled=false;break;
    case 'forget':selected=false;enabled=false;break;
    case 'begin':{
     available();const old=files.get(m.name);
     if(old){if(old.length!==m.size||cryptoNode.createHash('sha256').update(old).digest('hex')!==m.sha256)throw Error('USB collision checksum');result={...result,alreadyVerified:true,verified:true,bytes:m.size};}
     else transfers.set(m.id,{name:m.name,size:m.size,sha:m.sha256,index:0,chunks:[]});break;
    }
    case 'chunk':{
     available();const job=transfers.get(m.id);if(!job||job.index!==m.index)throw Error('invalid chunk');
     job.chunks.push(Buffer.from(m.base64,'base64'));job.index++;result={...result,bytes:job.chunks.reduce((s,b)=>s+b.length,0)};break;
    }
    case 'finish':{
     available();const job=transfers.get(m.id);if(!job)throw Error('not active');const bytes=Buffer.concat(job.chunks);
     if(bytes.length!==job.size||cryptoNode.createHash('sha256').update(bytes).digest('hex')!==job.sha)throw Error('checksum failed');
     files.set(job.name,corrupt?Buffer.from('corrupted'):bytes);transfers.delete(m.id);
     result={...result,bytes:bytes.length,verified:!corrupt,name:job.name};break;
    }
    case 'verify':{
     available();const bytes=files.get(m.name);
     if(!bytes||bytes.length!==m.size||cryptoNode.createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('backup missing or corrupt');
     result={...result,verified:true,bytes:bytes.length};break;
    }
    case 'abort':transfers.delete(m.id);result={...result,aborted:true};break;
    default:throw Error('unknown command');
   }
  }catch(e){result.error=e.message;}
  queueMicrotask(()=>bridge.onmessage({data:JSON.stringify(result)}));
 }};
 return {bridge,calls,files,transfers,disconnect:()=>connected=false,reconnect:()=>connected=true,corrupt:()=>corrupt=true};
}

test('deterministic private filename and folder ledger identity, no traversal or QR secrets',()=>{
 const c=clip();const name=fileNameFor(c);
 assert.equal(name,'RetroBooth_20261128193045_00007_aaaaaaaaaaaaaaaa.webm');
 assert.equal(key('usb-A',c),'usb-A:'+c.id);
 assert.equal(isSaved(c),true);assert.equal(isSaved({...c,kind:'demo'}),false);
 assert.equal(isSaved({...c,lifecycle:'deleted'}),false);
 assert.throws(()=>fileNameFor({...c,mime:'application/json'}),/Only original/);
});
test('real clip copied in <=32 KiB chunks then independently verified with full checksum',async()=>{
 const stub=mockNative();const native=new RetroBackupClient(stub.bridge);await native.select();
 const c=clip('x'.repeat(84000));const progress=[];
 const r=await native.copy(c,(done,total)=>progress.push([done,total]));
 assert.equal(r.verified,true);assert.equal(r.bytes,84000);
 assert.equal(stub.files.get(fileNameFor(c)).length,84000);
 assert.equal(stub.calls.filter(x=>x.op==='chunk').length,3);
 assert(progress.at(-1)[0]===84000);
 assert((await native.verify(c)).verified);
 const again=await native.copy(c);assert.equal(again.alreadyVerified,true);
 assert.equal(stub.calls.filter(x=>x.op==='chunk').length,3,'no duplicate video after retry');
});
test('disconnected USB and missing final file never report verified, original clip untouched',async()=>{
 const stub=mockNative(),native=new RetroBackupClient(stub.bridge);await native.select();const c=clip('safe in app');
 stub.disconnect();await assert.rejects(native.copy(c),/USB unavailable/);
 assert.equal(c.blob.size,11);assert.equal(stub.files.size,0);
 stub.reconnect();await assert.rejects(native.verify(c),/missing or corrupt/);
});
test('recording begins during copy => abort temp, safe retry on next idle',async()=>{
 const stub=mockNative(),native=new RetroBackupClient(stub.bridge);await native.select();const c=clip('v'.repeat(80000));let active=true;
 await assert.rejects(native.copy(c,()=>{active=false;},()=>active),/postponed/);
 assert.equal(stub.files.size,0);assert.equal(stub.transfers.size,0);
 assert(stub.calls.some(m=>m.op==='abort'));
 assert.equal((await native.copy(c)).verified,true);
});
test('tampered USB copy fails full verification; no false success after transfer',async()=>{
 const stub=mockNative(),native=new RetroBackupClient(stub.bridge);await native.select();const c=clip();await native.copy(c);
 stub.files.set(fileNameFor(c),Buffer.from('different'));
 await assert.rejects(native.verify(c),/missing or corrupt/);
 await assert.rejects(native.copy(c),/USB collision checksum/);
});
test('lost native begin acknowledgement still aborts its temporary USB transfer',async()=>{
 const stub=mockNative(),native=new RetroBackupClient(stub.bridge);await native.select();
 const dispatch=native.command.bind(native);
 native.command=(op,data,id,timeout)=>{
  if(op!=='begin')return dispatch(op,data,id,timeout);
  // Native did open a temp; its acknowledgement never reached JavaScript.
  stub.bridge.postMessage(JSON.stringify({id,op,...data}));
  return Promise.reject(new Error('lost begin acknowledgement'));
 };
 await assert.rejects(native.copy(clip()),/lost begin acknowledgement/);
 assert.equal(stub.transfers.size,0,'abort must close a temp opened before an acknowledgement was lost');
 assert(stub.calls.some(m=>m.op==='abort'),'abort command sent even though begin did not resolve');
});
test('native responses carry only request ID, pending handlers recover from timeout',async()=>{
 const native=new RetroBackupClient({onmessage:null,postMessage(){}});
 await assert.rejects(native.command('status',{},null,10),/timed out/);
 assert.equal(native.pending.size,0);
});
