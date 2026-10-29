import test from 'node:test';
import assert from 'node:assert/strict';
import {TanxScene} from '../tanx-scene.mjs';
function fixture(){
 const listeners=new Map(),sent=[],events=new Map();
 globalThis.location={origin:'https://classroom.example'};
 globalThis.window={addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
 const frame={style:{},contentWindow:{postMessage:data=>sent.push(data)},addEventListener:(k,f)=>events.set(k,f),remove(){this.removed=true;}};
 globalThis.document={createElement:()=>frame};
 const canvas={after(){},hidden:false},aims=[],scene=new TanxScene(canvas,{textContent:''},{battle:{round:1},canAim:true,onAim:a=>aims.push(a)});
 const message=(data,origin=location.origin,source=frame.contentWindow)=>listeners.get('message')?.({origin,source,data:{source:'tanx-child',token:scene.token,...data}});
 return {scene,frame,canvas,sent,events,message,aims,listeners};
}
test('classroom replay waits for the iframe before initializing the correct stored shot',async()=>{
 const f=fixture(),replay={caption:'Impact',angle:45,power:60};const pending=f.scene.playReplay(replay);
 assert.deepEqual(f.sent,[]);f.events.get('load')();assert.deepEqual(f.sent.map(x=>x.type),['init','replay']);assert.deepEqual(f.sent[1].replay,replay);
 f.message({type:'replay-ended'});assert.deepEqual(await pending,{cancelled:false});f.scene.destroy();assert.equal(f.canvas.hidden,false);assert.equal(f.frame.removed,true);assert.equal(f.listeners.size,0);
});
test('aim and resize messages require the correct origin, iframe and per-view token',()=>{
 const f=fixture();for(const data of [{type:'aim',token:'forged'}, {type:'aim',source:'other'}])f.message(data);
 f.message({type:'aim'},'https://untrusted.example');f.message({type:'aim'},location.origin,{});assert.deepEqual(f.aims,[]);
 f.message({type:'aim',angle:60,power:70});assert.deepEqual(f.aims,[{angle:60,power:70}]);
 f.message({type:'resize',height:50000});assert.equal(f.frame.style.height,'1600px');f.scene.destroy();
});
test('replacing or skipping a pending classroom shot resolves each replay exactly once',async()=>{
 const f=fixture(),old=f.scene.playReplay({caption:'Old'}),next=f.scene.playReplay({caption:'Next'});
 assert.deepEqual(await old,{cancelled:true});f.events.get('load')();assert.equal(f.sent.filter(x=>x.type==='replay').length,1);assert.equal(f.sent.at(-1).replay.caption,'Next');
 f.scene.skipReplay();assert.deepEqual(await next,{cancelled:false});f.scene.destroy();
});
