const CACHE="spin-city-books-v13";
const SHELL=["./","./index.html","./manifest.webmanifest","./assets/spin-city-logo.webp","./branding.js","./transaction-audit.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  const req=e.request;
  e.respondWith(fetch(req).then(async r=>{
    if(!r.ok)return r;
    const url=new URL(req.url);
    if(req.mode==="navigate" || url.pathname.endsWith("/index.html")){
      let html=await r.text();
      if(!html.includes("transaction-audit.js")) html=html.replace(/<\/body>/i,'<script src="./transaction-audit.js?v=13"></script></body>');
      const headers=new Headers(r.headers);
      headers.delete("content-encoding");
      headers.delete("content-length");
      const out=new Response(html,{status:r.status,statusText:r.statusText,headers});
      caches.open(CACHE).then(c=>c.put(req,out.clone()));
      return out;
    }
    const c=r.clone();
    caches.open(CACHE).then(x=>x.put(req,c));
    return r;
  }).catch(()=>caches.match(req).then(r=>r||caches.match("./index.html"))));
});
