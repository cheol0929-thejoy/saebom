/* 새봄묵상 앱 서비스워커 — 껍데기는 캐시 우선(판 이름 = 빌드 해시), index.json·날짜별 묵상은 네트워크 우선(안 되면 저장본), 그림은 이름이 바뀌면 새로 받음, 최근 14일 보관 */
var SHELL="saebom-shell-v1-41a50b7897", DATA="saebom-data";
var SHELL_FILES=["./","index.html","app.css","app.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
var KEEP=14;
self.addEventListener("install",function(ev){ev.waitUntil(caches.open(SHELL).then(function(c){return c.addAll(SHELL_FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener("activate",function(ev){ev.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf("saebom-shell-")===0&&k!==SHELL;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}).then(prefetch));});
function prefetch(){return fetch("data/index.json",{cache:"no-cache"}).then(function(r){if(!r.ok)throw 0;var cl=r.clone();return caches.open(DATA).then(function(c){return c.put("data/index.json",cl).then(function(){return r.json();}).then(function(j){
  var days=j.days.slice(0,KEEP);var want=[];days.forEach(function(d){want.push("data/"+d.iso+".json");});
  return Promise.all(want.map(function(u){return fetch(u,{cache:"no-cache"}).then(function(x){if(!x.ok)return;var y=x.clone();return c.put(u,y).then(function(){return x.json();}).then(function(e){if(e.image&&e.image.src)return c.match(e.image.src).then(function(h){return h||fetch(e.image.src).then(function(z){if(z.ok)return c.put(e.image.src,z);});});});}).catch(function(){});})).then(function(){return prune(c,days);});});});}).catch(function(){});}
function prune(c,days){var keepJ={},keepI={};days.forEach(function(d){keepJ["data/"+d.iso+".json"]=1;});
  return c.keys().then(function(reqs){return Promise.all(reqs.map(function(q){var p=new URL(q.url).pathname,m=p.match(/data\/(\d{4}-\d{2}-\d{2})\.json$/),i=p.match(/img\/(\d{4}-\d{2}-\d{2})/);
    if(m&&!keepJ["data/"+m[1]+".json"])return c.delete(q);if(i&&!days.some(function(d){return d.iso===i[1];}))return c.delete(q);}));});}
self.addEventListener("fetch",function(ev){var u=new URL(ev.request.url);if(ev.request.method!=="GET"||u.origin!==location.origin)return;
  var p=u.pathname;
  if(/\/sw\.js$/.test(p))return;
  if(/\/data\/index\.json$/.test(p)){ev.respondWith(fetch(ev.request,{cache:"no-cache"}).then(function(r){if(r.ok){var cl=r.clone();caches.open(DATA).then(function(c){c.put("data/index.json",cl);});ev.waitUntil(prefetch());}return r;}).catch(function(){return caches.open(DATA).then(function(c){return c.match("data/index.json");}).then(function(hit){if(!hit)throw new Error("offline");
    return hit.text().then(function(t){return new Response(t,{status:200,headers:{"Content-Type":"application/json","X-Saebom-Offline":"1"}});});});}));return;}
  if(/\/data\/\d{4}-\d{2}-\d{2}\.json$/.test(p)){ /* 네트워크 우선 - 녹음이 나중에 붙거나 그림이 바뀐 날도 바로 반영, 안 되면 저장본 */
    ev.respondWith(caches.open(DATA).then(function(c){return fetch(ev.request,{cache:"no-cache"}).then(function(r){if(r.ok)c.put(ev.request,r.clone());return r;}).catch(function(){return c.match(ev.request,{ignoreSearch:true}).then(function(hit){if(hit)return hit;throw new Error("offline");});});}));return;}
  if(/\/img\//.test(p)){ev.respondWith(caches.open(DATA).then(function(c){return c.match(ev.request,{ignoreSearch:true}).then(function(hit){return hit||fetch(ev.request).then(function(r){if(r.ok)c.put(ev.request,r.clone());return r;});});}));return;}
  ev.respondWith(caches.match(ev.request,{ignoreSearch:true}).then(function(hit){return hit||fetch(ev.request);}).catch(function(){return caches.match("index.html");}));
});
