'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const S = require('./security.cjs');
function loadAssets(root) {
  const info = JSON.parse(fs.readFileSync(path.join(root, 'DESKTOP_ASSETS.json'), 'utf8'));
  const bodies = new Map();
  for (const [, [name]] of S.STATIC_ROUTES) {
    if (bodies.has(name)) continue;
    const body = fs.readFileSync(path.join(root, name));
    if (crypto.createHash('sha256').update(body).digest('hex') !== info.files[name]) throw new Error('Bundled asset verification failed: ' + name);
    bodies.set(name, body);
  }
  if (typeof info.csp !== 'string' || !info.csp.includes("object-src 'none'")) throw new Error('Missing desktop CSP.');
  return function response(request) {
    const route = S.isAppURL(request.url) ? S.STATIC_ROUTES.get(S.parse(request.url).pathname) : null;
    if (!route) return new Response('Not found', { status: 404 });
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    return new Response(request.method === 'HEAD' ? null : bodies.get(route[0]), { status: 200, headers: {
      'Content-Type': route[1], 'Content-Security-Policy': info.csp,
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), display-capture=()'
    }});
  };
}
module.exports = { loadAssets };
