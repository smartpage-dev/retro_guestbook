'use strict';
const APP_ORIGIN = 'retrobooth://app';
const ENTRY = APP_ORIGIN + '/index.html';
const STATIC_ROUTES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/BUILD_INFO.json', ['BUILD_INFO.json', 'application/json']],
  ['/THIRD_PARTY_NOTICES.txt', ['THIRD_PARTY_NOTICES.txt', 'text/plain; charset=utf-8']]
]);
function parse(value) { try { return new URL(value); } catch { return null; } }
function isAppURL(value) {
  const u = parse(value);
  return !!u && u.protocol === 'retrobooth:' && u.hostname === 'app' && !u.port && !u.username && !u.password;
}
function isEntry(value) { const u = parse(value); return isAppURL(value) && ['/', '/index.html'].includes(u.pathname); }
function cloudOrigin(value) {
  if (typeof value !== 'string' || value.length > 255) throw new Error('Invalid cloud origin.');
  const u = parse(value);
  if (!u || u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash || u.port || !/^(?=.{4,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname) || /(?:^|\.)(?:localhost|local|internal)$/.test(u.hostname) || /^\d+(?:\.\d+){3}$/.test(u.hostname)) {
    throw new Error('Use a public root HTTPS hostname with no path or credentials.');
  }
  return u.origin;
}
function isAPI(value, approved) {
  const u = parse(value);
  return !!approved && !!u && u.origin === approved && !u.username && !u.password &&
    u.protocol === 'https:' && /^\/api\/[a-zA-Z0-9/_-]+$/.test(u.pathname) && !u.hash;
}
function guestURL(value, approved) {
  const u = parse(value);
  return !!approved && !!u && u.origin === approved && !u.username && !u.password && u.pathname === '/guest/' && !u.search && /^#[a-f0-9]{32}\.[A-Za-z0-9_-]{32}$/.test(u.hash);
}
function networkAllowed(value, approved) {
  if (isAppURL(value)) return STATIC_ROUTES.has(parse(value).pathname);
  if (typeof value === 'string' && value.startsWith('blob:' + APP_ORIGIN + '/')) return true;
  if (typeof value === 'string' && value.startsWith('data:image/')) return true;
  return isAPI(value, approved);
}
function suggestedName(value) {
  const name = String(value || '').replace(/[/\\]/g, '_').replace(/[<>:"|?*\x00-\x1f]/g, '_').slice(0,160).replace(/[. ]+$/, '');
  const match = /\.([a-z0-9]+)$/i.exec(name);
  if (!match || !['mp4','webm','png','jpg','jpeg','json','txt'].includes(match[1].toLowerCase()) || /^(con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(name)) throw new Error('Export file type or name is not allowed.');
  return name;
}
function trustedIPC(event, win) {
  return !!win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && isEntry(event.senderFrame.url);
}
module.exports = { APP_ORIGIN, ENTRY, STATIC_ROUTES, parse, isAppURL, isEntry, cloudOrigin, isAPI, guestURL, networkAllowed, suggestedName, trustedIPC };
