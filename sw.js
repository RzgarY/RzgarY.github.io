const IMG='dbinder-img-v2',APP='dbinder-app-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('dbinder-img-')&&k!==IMG)await caches.delete(k);await clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.hostname==='assets.tcgdex.net')e.respondWith(img(r));else if(u.origin===location.origin)e.respondWith(app(r))});
// only verified 200 CORS responses are cached; opaque/404/5xx are passed through, never stored (old code could cache a broken opaque response forever)
async function img(r){const c=await caches.open(IMG),key=r.url.split('?')[0],h=await c.match(key);if(h)return h;let res;
 try{res=await fetch(r.url,{mode:'cors'})}catch(_){try{res=await fetch(r)}catch(e){return Response.error()}}
 if(res.type==='cors'&&res.status===200)c.put(key,res.clone());return res}
async function app(r){const c=await caches.open(APP);try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}catch(e){const h=await c.match(r);if(h)return h;throw e}}
