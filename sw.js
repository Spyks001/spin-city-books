const CACHE="spin-city-books-v16";
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
      const emailHook='<script>(function(){if(window.__spinCityEmailHook)return;window.__spinCityEmailHook=1;function hook(){const f=document.getElementById("orderForm");if(!f||f.__emailHook)return;f.__emailHook=1;f.addEventListener("submit",async function(){const id=document.getElementById("orderId")?.value;if(!id||typeof sb==="undefined")return;let before=null;try{const r=await sb.from("orders").select("updated_at").eq("id",id).single();before=r.data?.updated_at||null}catch{}setTimeout(async function(){try{const r=await sb.from("orders").select("updated_at").eq("id",id).single();if(r.data?.updated_at&&r.data.updated_at!==before)await sb.functions.invoke("order-update-email",{body:{order_id:id}})}catch(e){console.warn("Spin City email notification failed",e)}},1200)},true)}hook();new MutationObserver(hook).observe(document.body,{childList:true,subtree:true})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hook);else hook()})();</script>';
      if(!html.includes('transaction-audit.js')) html=html.replace(/<\/body>/i,'<script src="./transaction-audit.js?v=16"></script><script src="./date-format-fix.js?v=16"></script>'+emailHook+'</body>');
      else if(!html.includes('date-format-fix.js')) html=html.replace(/<\/body>/i,'<script src="./date-format-fix.js?v=16"></script>'+emailHook+'</body>');
      else if(!html.includes('__spinCityEmailHook')) html=html.replace(/<\/body>/i,emailHook+'</body>');
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
      const emailHook='<script>(function(){if(window.__spinCityEmailHook)return;window.__spinCityEmailHook=1;function hook(){const f=document.getElementById("orderForm");if(!f||f.__emailHook)return;f.__emailHook=1;f.addEventListener("submit",async function(){const id=document.getElementById("orderId")?.value;if(!id||typeof sb==="undefined")return;let before=null;try{const r=await sb.from("orders").select("updated_at").eq("id",id).single();before=r.data?.updated_at||null}catch{}setTimeout(async function(){try{const r=await sb.from("orders").select("updated_at").eq("id",id).single();if(r.data?.updated_at&&r.data.updated_at!==before)await sb.functions.invoke("order-update-email",{body:{order_id:id}})}catch(e){console.warn("Spin City email notification failed",e)}},1200)},true)}hook();new MutationObserver(hook).observe(document.body,{childList:true,subtree:true})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",hook);else hook()})();</script>';
      if(!html.includes('transaction-audit.js')) html=html.replace(/<\/body>/i,'<script src="./transaction-audit.js?v=16"></script><script src="./date-format-fix.js?v=16"></script>'+emailHook+'</body>');
      else if(!html.includes('date-format-fix.js')) html=html.replace(/<\/body>/i,'<script src="./date-format-fix.js?v=16"></script>'+emailHook+'</body>');
      else if(!html.includes('__spinCityEmailHook')) html=html.replace(/<\/body>/i,emailHook+'</body>');
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
