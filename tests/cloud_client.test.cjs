/** Client algorithm tests, explicitly mocked storage/network. Backend HTTP tests are separate. */
const assert=require('node:assert/strict'),C=require('../src/cloud-client.js');let n=0;
const check=(name,ok)=>{assert(ok,name);n++;console.log('PASS',name);};
const cfg={enabled:true,serverOrigin:'https://example.test',eventId:'a'.repeat(32),deviceId:'b'.repeat(32),deviceToken:'b'.repeat(32)+'.'+'D'.repeat(32),expiresAt:Math.floor(Date.now()/1000)+86400};
const slot=i=>({id:i.toString(16).padStart(32,'0'),eventId:cfg.eventId,ownerToken:i.toString(16).padStart(32,'0')+'.'+'O'.repeat(32),viewToken:i.toString(16).padStart(32,'0')+'.'+'V'.repeat(32),expiresAt:cfg.expiresAt});
const rejects=fn=>{try{fn();return false;}catch{return true;}};
(async()=>{
 check('valid HTTPS setup is normalized',C.config(cfg).serverOrigin==='https://example.test');
 check('remote plain HTTP rejected',rejects(()=>C.config({...cfg,serverOrigin:'http://example.test'})));
 check('loopback development HTTP supported',C.config({...cfg,serverOrigin:'http://127.0.0.1:4180'}).serverOrigin.endsWith('4180'));
 for(const url of ['https://u:p@example.test','https://example.test/path','https://example.test/?x=1','https://example.test/#x'])check('unsafe base URL rejected '+url,rejects(()=>C.config({...cfg,serverOrigin:url})));
 check('mismatched device credential rejected',rejects(()=>C.config({...cfg,deviceId:'c'.repeat(32)})));
 check('guest management link is in URL fragment',C.guestURL({...slot(1),transport:cfg}).includes('/guest/#'));
 check('owner and viewer links distinct',C.guestURL({...slot(1),transport:cfg})!==C.guestURL({...slot(1),transport:cfg},true));
 check('wrong reservation identity rejected',rejects(()=>C.guestURL({...slot(1),id:'2'.repeat(32),transport:cfg})));
 check('wrong event rejected',rejects(()=>C.guestURL({...slot(1),eventId:'c'.repeat(32),transport:cfg})));
 const saved={},used=new Set();let records=[],canRun=true,calls=[],failChunk=false,remoteDeleted=false,purges=0,acks=0;
 const store={getAux:async k=>saved[k],setAux:async(k,v)=>saved[k]=structuredClone(v),appendCloudSlots:async(binding,slots)=>{const old=saved['cloud-pool'];saved['cloud-pool']={binding,slots:[...(old?.binding===binding?old.slots:[]),...slots]};},takeCloudSlot:async(binding,id)=>{const pool=saved['cloud-pool'];if(!pool||pool.binding!==binding)return null;while(pool.slots.length){const x=pool.slots.shift();if(!used.has(x.id)){used.add(x.id);return {...x,localId:id};}}return null;},list:async()=>records,ackCloudDeletion:async id=>{const c=records.find(x=>x.id===id);if(c)c.cloud.ackPending=false;}};
 let next=1,received=new Set(),expected=null;
 const fetcher=async(url,opt)=>{
  calls.push({url,opt});const path=new URL(url).pathname;let code=200,body={};
  if(path.endsWith('/verify'))body={deviceId:cfg.deviceId,event:{id:cfg.eventId,expiresAt:cfg.expiresAt},publicOrigin:cfg.serverOrigin};
  else if(path.endsWith('/reserve'))body={slots:Array.from({length:JSON.parse(opt.body).count},()=>slot(next++))};
  else if(path.endsWith('/status'))body={id:records[0].cloud.id,status:remoteDeleted?'deleted':'uploading',permission:'hidden',moderation:'pending',revision:2};
  else if(path.endsWith('/init')){const v=JSON.parse(opt.body);if(expected&&JSON.stringify(v)!==JSON.stringify(expected))throw new Error('unexpected metadata change');expected=v;body={status:'uploading',received:[...received],chunkBytes:524288};}
  else if(path.includes('/chunk/')){const i=Number(path.split('/').at(-1));if(failChunk&&i===1){failChunk=false;throw new TypeError('Network disconnected fixture');}received.add(i);body={accepted:true};}
  else if(path.endsWith('/complete'))body={ready:true,sha256:expected.sha256,size:expected.size};
  else if(path.endsWith('/ack-delete')){acks++;body={acknowledged:true};}
  return {ok:code<400,status:code,json:async()=>body};
 };
 const change=async(id,fn)=>{const i=records.findIndex(x=>x.id===id);if(records[i].lifecycle==='deleted')return records[i];records[i]=fn(records[i]);return records[i];};
 const purge=async clip=>{purges++;const i=records.findIndex(x=>x.id===clip.id);records[i]={id:clip.id,lifecycle:'deleted',cloud:{id:clip.cloud.id,transport:cfg,ackPending:true}};};
 const make=()=>new C.Client({store,list:()=>store.list(),change,purge,canRun:()=>canRun,fetcher});
 let client=make();await client.init();check('new install cloud off',client.connection===null);
 await client.connect(cfg);check('connect verifies server then reserves twelve links',client.poolCount===12&&calls[0].url.endsWith('/verify'));
 const frozen=await client.claim('c'.repeat(32));check('claim consumes one link',client.poolCount===11);check('slot freezes server and event',frozen.transport.serverOrigin===cfg.serverOrigin&&frozen.eventId===cfg.eventId);
 client=make();await client.init();check('restarted client restores connection and pool',client.poolCount===11&&client.connection.deviceId===cfg.deviceId);
 const second=await client.claim('d'.repeat(32));check('restart does not reuse consumed link',second.id!==frozen.id);
 let blob=new Blob([new Uint8Array(1100000)]);records=[{id:'c'.repeat(32),kind:'real',lifecycle:'active',cloud:frozen,blob,mime:'video/mp4',sha256:await C.sha(blob),seq:1,validation:{status:'metadata_readable'}}];
 canRun=false;const before=calls.length;await client.tick();check('recording pauses new cloud work',calls.length===before);
 canRun=true;failChunk=true;await client.tick();check('partial upload retained for retry',received.has(0)&&!received.has(1)&&records[0].cloud.attempts===1&&records[0].blob===blob);
 records[0].cloud.retryAt=0;client=make();await client.init();await client.tick();check('queue resumes after client restart',records[0].cloud.status==='ready');
 check('already accepted chunk not resent',calls.filter(x=>x.url.endsWith('/chunk/0')).length===1);
 check('whole file hash acknowledged before ready',records[0].cloud.verifiedAt>0);
 check('cloud copy does not auto-delete local media',records[0].blob===blob);
 const frozenUrl=C.guestURL(records[0].cloud);await client.disable();check('local-only affects new capture not frozen jobs',client.connection===null&&C.guestURL(records[0].cloud)===frozenUrl);
 remoteDeleted=true;records[0].cloud.lastCheck=0;await client.tick();check('server tombstone purges local Blob',records[0].lifecycle==='deleted'&&!records[0].blob&&purges===1);check('local cleanup acknowledged after purge',acks===1);
 await client.tick();check('pending ack can finish without resurrecting clip',records[0].lifecycle==='deleted'&&acks===2);
 check('device tokens only in authorization not URL',calls.every(x=>!x.url.includes(cfg.deviceToken)));
 check('cross-origin requests omit ambient cookies',calls.every(x=>x.opt.credentials==='omit'));
 check('network redirects forbidden',calls.every(x=>x.opt.redirect==='error'));
 console.log('TOTAL '+n+' PASSED');
})().catch(e=>{console.error(e);process.exitCode=1;});
