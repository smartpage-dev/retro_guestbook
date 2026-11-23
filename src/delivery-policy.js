/* Pure post-recording policy. No network, printer I/O or event/guest URL creation. */
(function(root){
  'use strict';
  const MODES=Object.freeze(['screen','smart','both']);
  function seconds(value, fallback, min, max){
    if(value===null||value===undefined||value==='')return fallback;
    const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;
  }
  function safe(raw={}){return {
    postRecordMode:MODES.includes(raw.postRecordMode)?raw.postRecordMode:'smart',
    qrDisplaySeconds:seconds(raw.qrDisplaySeconds,10,5,60),
    printWaitSeconds:seconds(raw.printWaitSeconds,4,1,15),
    receiptPrintEnabled:raw.receiptPrintEnabled===true
  };}
  function snapshot(clip,payload){
    if(!clip||!/^[a-f0-9]{32}$/.test(clip.id))throw new Error('Invalid delivery session.');
    const online=clip.kind==='real'&&!!clip.cloud;
    const expected=online?(root.RetroCloud||require('./cloud-client.js')).guestURL(clip.cloud):'RETROBOOTH:LOCAL-PROTOTYPE:NO-ONLINE-VIDEO:'+clip.id;
    if(payload!==expected)throw new Error('QR payload must match this saved clip and its frozen reservation.');
    return Object.freeze({revision:1,issueKey:'retrobooth:'+clip.id+':receipt:1',clipId:clip.id,
      payload,containsQR:clip.settings?.receipt!=='photo',template:'receipt-preview-v1',
      receiptStyle:clip.settings?.receiptStyle||'classic',label:'Message '+String(clip.seq).padStart(3,'0'),
      online});
  }
  function matches(ticket,result){return !!(ticket&&result&&result.issueKey===ticket.issueKey&&result.clipId===ticket.clipId&&result.payload===ticket.payload);}
  function decision(config,ticket,result,context={}){
    const s=safe(config);
    if(s.postRecordMode==='screen')return {route:'qr',reason:'screen_only'};
    if(!s.receiptPrintEnabled)return {route:'qr',reason:'print_disabled'};
    if(!ticket?.containsQR)return {route:'qr',reason:'receipt_has_no_qr'};
    if(context.receiptError)return {route:'qr',reason:'receipt_artwork_failed'};
    if(!matches(ticket,result))return {route:'qr',reason:'missing_or_mismatched_result'};
    // Native fast return is explicitly accepted transport success, NEVER paper confirmation.
    // Demo confirmation remains isolated from real captures.
    const confirmed=result.state==='printed_confirmed' && result.simulated===true &&
      context.demo===true && context.simulationEnabled===true;
    if(s.postRecordMode==='both')return {route:'qr',reason:'always_screen'};
    if(context.nativeValidated===true && result.nativeValidated===true && result.transport==='android_secure_spp' && result.simulated===false && result.state==='sent_unconfirmed' && result.paperConfirmed===false && result.fastReturnEligible===true && result.duplicate!==true && ticket.online===true && context.demo!==true)return {route:'bypass',reason:'operator_accepted_unconfirmed_send'};
    if(confirmed)return {route:'bypass',reason:'demo_confirmed_print'};
    return {route:'qr',reason:result.state==='printed_confirmed'?'unsupported_physical_confirmation':String(result.state||'not_connected')};
  }
  function remaining(deadline,now){return Math.max(0,Math.ceil((deadline-now)/1000));}
  const api={MODES,safe,snapshot,matches,decision,remaining};root.RetroDelivery=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
