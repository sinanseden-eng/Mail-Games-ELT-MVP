const CACHE='mailgames-classroom-v1';
const OFFLINE='/classroom-offline.html';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/assets/classroom-icon.svg']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mailgames-classroom-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Never store API responses, questions, account data, or authenticated pages.
  if(event.request.mode==='navigate' && url.pathname==='/classroom.html')event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));
});
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const target=new URL(data.url||'/classroom.html',self.location.origin);
  const url=target.origin===self.location.origin&&target.pathname==='/classroom.html'?target.href:new URL('/classroom.html',self.location.origin).href;
  event.waitUntil(self.registration.showNotification(String(data.title||'Mail Games').slice(0,100),{body:String(data.body||'Your classroom has an update.').slice(0,200),icon:'/assets/classroom-icon-192.png',badge:'/assets/classroom-icon-192.png',tag:String(data.tag||'classroom').slice(0,100),data:{url}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    const url=event.notification.data?.url||new URL('/classroom.html',self.location.origin).href;
    for(const client of clients)if(new URL(client.url).origin===self.location.origin){await client.navigate(url);return client.focus();}
    return self.clients.openWindow(url);
  }));
});
