// 틈날때버는월급 서비스워커: 오프라인에서도 열리게 기본 파일을 캐시하고, 알림을 누르면 앱으로 돌아오게 한다.
const C='tm-v2',FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./teumi-friends.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();const m=(e.notification.data||{}).m||'';e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>{for(const c of cs){c.postMessage({go:m});return c.focus()}return self.clients.openWindow('./?go='+m)}))});
