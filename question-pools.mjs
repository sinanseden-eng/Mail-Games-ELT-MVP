const KEY = 'mailgames.pools.v1', ACTIVE = 'mailgames.questions.v1';
export function makePoolStore(storage) {
  function read() {
    const raw=storage.getItem(KEY);
    if(raw) { const data=JSON.parse(raw); if(Array.isArray(data.pools) && data.pools.length) return data; }
    let questions=[]; try { questions=JSON.parse(storage.getItem(ACTIVE)||'[]'); } catch {}
    return {activeId:'original',pools:[{id:'original',name:'My questions',questions:Array.isArray(questions)?questions:[]}]};
  }
  function write(data) {
    const active=data.pools.find(p=>p.id===data.activeId);
    // Roll back both keys if either storage write fails.
    const oldPools=storage.getItem(KEY),oldActive=storage.getItem(ACTIVE);
    try {storage.setItem(KEY,JSON.stringify(data));storage.setItem(ACTIVE,JSON.stringify(active.questions));}
    catch(error) {try {oldPools===null?storage.removeItem(KEY):storage.setItem(KEY,oldPools);oldActive===null?storage.removeItem(ACTIVE):storage.setItem(ACTIVE,oldActive);}catch{} throw error;}
  }
  return {
    list:read,
    saveQuestions(questions){const data=read();data.pools.find(p=>p.id===data.activeId).questions=questions;write(data);},
    create(name,questions=[]){const data=read(),id=crypto.randomUUID();data.pools.push({id,name:name.trim()||'Untitled pool',questions});data.activeId=id;write(data);return id;},
    select(id){const data=read();if(!data.pools.some(p=>p.id===id))throw new Error('Pool not found.');data.activeId=id;write(data);},
    rename(name){const data=read();data.pools.find(p=>p.id===data.activeId).name=name.trim()||'Untitled pool';write(data);}
  };
}
export const poolStore = typeof localStorage==='undefined' ? null : makePoolStore(localStorage);
