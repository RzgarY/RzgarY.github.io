const V='binder-v1',IMGC='binder-img-v1',APP=['./','index.html','style.css','app.js','manifest.webmanifest','icons/favicon.svg','img/ball.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(APP)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==IMGC).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){const key=new Request(u.origin+u.pathname);
  e.respondWith(fetch(r,{cache:'no-store'}).then(x=>{if(x.ok){const y=x.clone();caches.open(V).then(c=>c.put(key,y))}return x}).catch(()=>caches.match(key)));return}
 if(r.destination==='image')e.respondWith(caches.open(IMGC).then(async c=>{const h=await c.match(r);if(h)return h;
  try{const x=await fetch(r);if(x.ok||x.type==='opaque'){c.put(r,x.clone());c.keys().then(k=>k.length>600&&c.delete(k[0]))}return x}catch(_){return Response.error()}}))});
