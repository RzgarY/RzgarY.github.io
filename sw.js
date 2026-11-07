const IMG='dbinder-img-v1',APP='dbinder-app-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.hostname==='assets.tcgdex.net')e.respondWith(img(r));else if(u.origin===location.origin)e.respondWith(app(r))});
async function img(r){const c=await caches.open(IMG),h=await c.match(r.url);if(h)return h;let res;
 try{res=await fetch(r.url,{mode:'cors'})}catch(_){try{res=await fetch(r)}catch(e){return Response.error()}}
 if(res.ok||res.type==='opaque')c.put(r.url,res.clone());return res}
async function app(r){const c=await caches.open(APP);try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}catch(e){const h=await c.match(r);if(h)return h;throw e}}
