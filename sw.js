const CACHE="spin-city-books-v15";
const SHELL=["./","./manifest.webmanifest","./assets/spin-city-logo.webp","./branding.js","./transaction-audit.js","./date-format-fix.js"];
async function cacheShell(){
  const cache=await caches.open(CACHE);
  for(const path of SHELL){
    try{const r=await fetch(path,{cache:'no-store'});if(r.ok)await cache.put(path,r.clone())}catch{}
  }
  try{
    const r=await fetch('./index.html',{cache:'no-store'});
    if(r.ok){
      let html=await r.text();
      if(!html.includes('transaction-audit.js')) html=html.replace(/<\/body>/i,'<script src="./transaction-audit.js?v=15"></script><script src="./date-format-fix.js?v=15"></script></body>');
      else if(!html.includes('date-format-fix.js')) html=html.replace(/<\/body>/i,'<script src="./date-format-fix.js?v=15"></script></body>');
      const h=new Headers(r.headers);h.delete('content-encoding');h.delete('content-length');
      await cache.put('./index.html',new Response(html,{status:r.status,statusText:r.statusText,headers:h}));
    }
  }catch{}
}
self.addEventListener("install",e=>e.waitUntil(cacheShell().then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(cacheShell)));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  const req=e.request;
  e.respondWith(fetch(req,{cache:'no-store'}).then(async r=>{
    if(!r.ok)return r;
    const url=new URL(req.url);
    if(req.mode==="navigate" || url.pathname.endsWith("/index.html")){
      let html=await r.text();
      if(!html.includes("transaction-audit.js")) html=html.replace(/<\/body>/i,'<script src="./transaction-audit.js?v=15"></script><script src="./date-format-fix.js?v=15"></script></body>');
      else if(!html.includes("date-format-fix.js")) html=html.replace(/<\/body>/i,'<script src="./date-format-fix.js?v=15"></script></body>');
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
