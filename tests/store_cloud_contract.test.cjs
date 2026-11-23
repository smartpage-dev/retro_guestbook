/** Executes the actual BrowserStore methods against an explicit transaction MOCK, not real IndexedDB. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const context={window:{},Promise,Error,Date};vm.runInNewContext(fs.readFileSync('src/store.js','utf8'),context);const Store=context.window.BrowserStore;let n=0;const check=(s,v)=>{assert(v,s);n++;console.log('PASS',s);};
const tables={settings:new Map(),clips:new Map()};let fail=false;
const db={transaction(name){let pending=0,finished=false;const names=Array.isArray(name)?name:[name],copy={};for(const name of names)copy[name]=new Map([...tables[name]].map(([k,v])=>[k,structuredClone(v)]));
 const tx={error:null,objectStore(name){const map=copy[name];return {get(key){const req={};pending++;setTimeout(()=>{req.result=structuredClone(map.get(key));req.onsuccess?.();pending--;finish();},0);return req;},put(v){map.set(v.key||v.id,structuredClone(v));return {};}};},abort(){if(finished)return;finished=true;tx.error=new Error('Mock aborted');setTimeout(()=>tx.onabort?.(),0);}};
 function finish(){setTimeout(()=>{if(pending||finished)return;if(fail){tx.abort();return;}finished=true;for(const name of names)tables[name]=copy[name];tx.oncomplete?.();},0);}finish();return tx;
}};
(async()=>{const s=new Store();s.available=true;s.db=db;const binding='https://example.test|event|device',slot={id:'a'.repeat(32),expiresAt:Math.floor(Date.now()/1000)+60};
 await s.setAux('cloud-pool',{binding,slots:[slot]});check('aux settings round trip',(await s.getAux('cloud-pool')).slots.length===1);
 fail=true;try{await s.takeCloudSlot(binding,'first');assert.fail('should reject');}catch(e){check('aborted claim rejects caller',true);}fail=false;
 check('aborted claim does not consume slot',(await s.getAux('cloud-pool')).slots.length===1);
 const first=await s.takeCloudSlot(binding,'first');check('claim returns correct reservation',first.id===slot.id&&first.localId==='first');check('claim consumes exactly one slot',(await s.getAux('cloud-pool')).slots.length===0);check('claim writes separate burned identity',(await s.getAux('cloud-used'))['https://example.test|'+slot.id]==='first');
 await s.appendCloudSlots(binding,[slot,{...slot,id:'b'.repeat(32)}]);const second=await s.takeCloudSlot(binding,'second');check('duplicated consumed reservation not reused',second.id==='b'.repeat(32));check('claim never changes prior identity',(await s.getAux('cloud-used'))['https://example.test|'+slot.id]==='first');check('empty pool returns null',await s.takeCloudSlot(binding,'third')===null);
 tables.clips.set('clip',{id:'clip',seq:1,lifecycle:'deleted',cloud:{ackPending:true,transport:{deviceToken:'secret'}}});await s.ackCloudDeletion('clip');const t=tables.clips.get('clip');check('ack handler actually writes tombstone',t.cloudDeleted===true);check('ack removes device credential from tombstone',!t.cloud);
 check('ack absent clip does not insert a new record',await s.ackCloudDeletion('absent')===undefined&&!tables.clips.has('absent'));
 console.log('TOTAL '+n+' PASSED');})().catch(e=>{console.error(e);process.exitCode=1;});
