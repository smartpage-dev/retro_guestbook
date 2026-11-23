/* Offline shell only, scoped cache. Never caches media or guest credentials. */
const PREFIX='luce-retrobooth-v05-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'0.8.0-alpha.1';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url),scope=new URL(self.registration.scope);
  if(e.request.method!=='GET'||e.request.mode!=='navigate'||u.origin!==self.location.origin||!([scope.pathname,scope.pathname+'index.html'].includes(u.pathname)))return;
  e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));
});
