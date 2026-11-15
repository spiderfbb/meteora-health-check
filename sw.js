/* Offline cache for Health Check at a Glance.
   Everything is fetched from the network first, so a new deploy shows at once and pages never mix old and new files.
   The cached copy is used only when there is no link. Space weather (api.nasa.gov) is never cached here. */
const VERSION='hcg-v1';
const PRECACHE=[
  './','console',
  'assets/css/base.css','assets/css/app.css','assets/css/site.css',
  'assets/js/geometry.js','assets/js/data.js','assets/js/app.js','assets/js/site.js','assets/js/figures.js',
  'assets/img/mark.svg','assets/img/icon-192.png',
  'assets/fonts/atkinson-mono-latin-400.woff2',
  'assets/fonts/atkinson-mono-latin-500.woff2',
  'assets/fonts/atkinson-mono-latin-600.woff2',
  'assets/fonts/atkinson-next-latin-400.woff2',
  'assets/fonts/atkinson-next-latin-500.woff2',
  'assets/fonts/atkinson-next-latin-600.woff2',
  'assets/fonts/atkinson-next-latin-700.woff2',
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  e.respondWith(
    fetch(req).then(res=>{
      if(res.ok&&!res.redirected&&res.type==='basic'){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(hit=>{
      if(hit)return hit;
      if(req.mode==='navigate')return caches.match(/\/console(\.html)?$/.test(url.pathname)?'console':'./');
      return Response.error();
    }))
  );
});
