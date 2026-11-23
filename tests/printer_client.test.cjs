'use strict';
const assert=require('node:assert/strict');const {webcrypto}=require('node:crypto');Object.defineProperty(global,'crypto',{value:webcrypto,configurable:true});
global.RetroCloud=require('../src/cloud-client.js');global.RetroCore=require('../src/core.js');const P=require('../src/printer-client.js'),D=require('../src/delivery-policy.js');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
const cid='1'.repeat(32),sid='2'.repeat(32),event='3'.repeat(32),device='4'.repeat(32);
function clip(){const c={id:cid,kind:'real',seq:47,lifecycle:'active',validation:{status:'metadata_readable'},settings:{receipt:'both'},cloud:{id:sid,eventId:event,ownerToken:sid+'.'+'O'.repeat(32),transport:{enabled:true,serverOrigin:'https://retro.example.test',eventId:event,deviceId:device,deviceToken:device+'.'+'D'.repeat(32)}}};c.deliverySnapshot=D.snapshot(c,RetroCloud.guestURL(c.cloud));return c;}
test('guest ticket preserves exact fragment URL',()=>assert.equal(P.guestTicket(clip()).payload,clip().deliverySnapshot.payload));
test('automatic ticket ID is stable local clip ID',()=>assert.equal(P.guestTicket(clip()).jobId,cid));
test('manual reprint uses new job but same URL and clip',()=>{const a=P.guestTicket(clip(),cid);assert.notEqual(a.jobId,cid);assert.equal(a.parent,cid);assert.equal(a.payload,clip().deliverySnapshot.payload);});
for(const [name,mutate] of Object.entries({demo:c=>c.kind='demo',deleted:c=>c.lifecycle='deleted',interrupted:c=>c.interrupted=true,unverified:c=>c.validation.status='bad',noCloud:c=>c.cloud=null,photoOnly:c=>c.settings.receipt='photo',wrongSnapshot:c=>c.deliverySnapshot={...c.deliverySnapshot,payload:'https://evil.test'},wrongId:c=>c.deliverySnapshot={...c.deliverySnapshot,clipId:'f'.repeat(32)},missingQR:c=>c.deliverySnapshot={...c.deliverySnapshot,containsQR:false},sequence:c=>c.seq=-1}))test(name+' rejected before native request',()=>{const c=clip();mutate(c);assert.throws(()=>P.guestTicket(c));});
test('other parent rejected',()=>assert.throws(()=>P.guestTicket(clip(),'f'.repeat(32))));
const c=clip(),cfg={receiptPrintEnabled:true,postRecordMode:'smart'},t=c.deliverySnapshot;
const result={...t,jobId:cid,clipId:cid,state:'sent_unconfirmed',transport:'android_secure_spp',nativeValidated:true,simulated:false,paperConfirmed:false,fastReturnEligible:true,duplicate:false};
test('untrusted send flag cannot bypass',()=>assert.equal(D.decision(cfg,t,result,{demo:false}).route,'qr'));
test('accepted and validated native send may bypass',()=>assert.equal(D.decision(cfg,t,result,{demo:false,nativeValidated:true}).route,'bypass'));
for(const [name,patch] of Object.entries({noAcceptance:{fastReturnEligible:false},duplicate:{duplicate:true},unknown:{state:'outcome_unknown'},paperClaim:{paperConfirmed:true},simulated:{simulated:true},wrongTransport:{transport:'web_bluetooth'},wrongPayload:{payload:'bad'},missingValidation:{nativeValidated:false}}))test(name+' retains QR',()=>assert.equal(D.decision(cfg,t,{...result,...patch},{demo:false,nativeValidated:true}).route,'qr'));
test('always-show wins over native acceptance',()=>assert.equal(D.decision({...cfg,postRecordMode:'both'},t,result,{demo:false,nativeValidated:true}).route,'qr'));
test('screen-only never bypasses',()=>assert.equal(D.decision({...cfg,postRecordMode:'screen'},t,result,{demo:false,nativeValidated:true}).route,'qr'));
test('disabled print route never bypasses',()=>assert.equal(D.decision({...cfg,receiptPrintEnabled:false},t,result,{demo:false,nativeValidated:true}).route,'qr'));
(async()=>{
 const noBridge=new P.Client(null);await assert.rejects(noBridge.call('print'),/Android APK/);n++;console.log('PASS browser has no printer bridge');
 const calls=[];let delayed=false;
 const bridge={postMessage(raw){const m=JSON.parse(raw);calls.push(m);if(delayed)return;setTimeout(async()=>bridge.onmessage({data:JSON.stringify({id:m.id,version:1,data:m.op==='print'?{jobId:m.jobId,clipId:m.clipId,urlHash:await P.hash(m.payload),transport:'android_secure_spp',state:'sent_unconfirmed',simulated:false,paperConfirmed:false,duplicate:false,fastReturnEligible:false}:{connected:false}})}),1);}};
 const client=new P.Client(bridge);const r=await client.send(c,{automatic:true,waitMs:1000});test('native acknowledgement validated but no paper claim',()=>assert(r.nativeValidated&&!r.paperConfirmed&&!r.fastReturnEligible));
 test('automatic request carries bounded deadline',()=>assert(calls[0].deadlineEpochMs>0&&calls[0].automatic));
 const before=calls.length;await assert.rejects(client.send(c,{automatic:true,waitMs:1000,deadlineEpochMs:Date.now()-1}));test('expired send never reaches native',()=>assert.equal(calls.length,before));
 await assert.rejects(client.send(c,{automatic:true,isCurrent:()=>false}));test('stale guest never reaches native',()=>assert.equal(calls.length,before));
 delayed=true;await assert.rejects(client.call('print',{},10));test('timeout sends targeted cancellation not global disconnect',()=>assert(calls.at(-1).op==='cancel'&&calls.at(-1).requestId===calls.at(-2).id));
 const pending=client.call('status',{},5000);client.pause();await assert.rejects(pending);test('pause clears pending RPCs',()=>assert.equal(client.pending.size,0));
 console.log('TOTAL '+n+' PASSED');
})().catch(e=>{console.error(e);process.exitCode=1;});
