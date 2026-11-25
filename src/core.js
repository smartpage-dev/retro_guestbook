/* RetroBooth v0.9.5-alpha.1. Pure, independently testable domain helpers. */
(function (root) {
  'use strict';
  const E=root.RetroEffects || require('./effects.js');
  const D=root.RetroDelivery || require('./delivery-policy.js');
  const edges = Object.freeze({
    idle: ['greeting', 'error'], greeting: ['countdown', 'idle', 'error'],
    countdown: ['recording', 'idle', 'error'], recording: ['saving', 'idle', 'error'],
    saving: ['receipt', 'error'], receipt: ['qr', 'thankyou', 'error'],
    qr: ['idle', 'error'],
    thankyou: ['idle', 'error'], error: ['idle', 'saving']
  });
  function transition(from, to) {
    if (!edges[from]?.includes(to)) throw new Error('Invalid transition: ' + from + ' -> ' + to);
    return to;
  }
  function randomId(cryptoApi = globalThis.crypto) {
    if (!cryptoApi?.getRandomValues) throw new Error('Secure random generation unavailable.');
    const bytes = new Uint8Array(16); cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  }
  function safeSettings(raw = {}) {
    if(!raw||typeof raw!=='object')raw={};
    return {
      ...E.safe(raw),
      ...D.safe(raw),
      title: String(raw.title || 'ALEX & SAM').trim().slice(0, 60) || 'ALEX & SAM',
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date || '') ? raw.date : '2026-12-20',
      duration: [10,30,60].includes(Number(raw.duration)) ? Number(raw.duration) : 10,
      screenStyle: ['edge','heritage'].includes(raw.screenStyle) ? raw.screenStyle : 'heritage',
      preset: ['warm','soft','mono'].includes(raw.preset) ? raw.preset : 'warm',
      grain: Math.max(0, Math.min(0.15, Number(raw.grain) || 0)),
      mirror: raw.mirror !== false, osd: raw.osd !== false,
      trigger: ['both','touch','handset'].includes(raw.trigger) ? raw.trigger : 'touch',
      receipt: ['both','qr','photo'].includes(raw.receipt) ? raw.receipt : 'both',
      countdown: [0,3].includes(Number(raw.countdown)) ? Number(raw.countdown) : 3,
      returnSeconds: [0,1,2,3,5].includes(Number(raw.returnSeconds)) ? Number(raw.returnSeconds) : 2,
      receiptStyle: ['classic','ticket','minimal'].includes(raw.receiptStyle) ? raw.receiptStyle : 'classic',
      receiptCaption: String(raw.receiptCaption || 'A LITTLE LOVE, TO KEEP.').slice(0,80),
      receiptFooter: String(raw.receiptFooter || 'THANK YOU FOR BEING HERE').slice(0,100),
      logoData: /^data:image\/(png|jpeg);base64,/.test(raw.logoData||'') && raw.logoData.length<300000 ? raw.logoData : '',
      showEnabled: raw.showEnabled === true,
      showDelay: [0,30,60,120].includes(Number(raw.showDelay)) ? Number(raw.showDelay) : 60
    };
  }
  function timeLabel(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  }
  function chooseMime(isSupported) {
    return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
      'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
      .find(m => {try {return isSupported(m);} catch {return false;}}) || '';
  }
  function extension(mime) { return (mime || '').includes('mp4') ? 'mp4' : 'webm'; }
  function cropRect(w, h, aspect) {
    if (!(w > 0 && h > 0 && aspect > 0)) throw new Error('Invalid crop dimensions');
    const sw = Math.min(w, h * aspect), sh = Math.min(h, w / aspect);
    return {x: (w - sw)/2, y: (h - sh)/2, w: sw, h: sh};
  }
  function qrPayload(id,cloud=null) {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid clip id');
    if(cloud)return (root.RetroCloud||require('./cloud-client.js')).guestURL(cloud);
    // Without an authenticated reservation, retain the explicit non-online marker.
    return 'RETROBOOTH:LOCAL-PROTOTYPE:NO-ONLINE-VIDEO:' + id;
  }
  function discardShort(durationMs, interrupted) {return durationMs < 2000 && !interrupted;}
  function publicEligible(clip, settings, now = Date.now()) {
    return Boolean(settings.showEnabled && clip && clip.lifecycle !== 'deleted' &&
      clip.guestPermission === 'allow' && clip.moderation === 'approved' &&
      Number.isFinite(clip.showAfter) && now >= clip.showAfter && !clip.interrupted &&
      (clip.kind === 'demo' || clip.validation?.status === 'metadata_readable'));
  }
  const api = {edges, transition, randomId, safeSettings, timeLabel, chooseMime, extension, cropRect, qrPayload, discardShort, publicEligible};
  root.RetroCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
