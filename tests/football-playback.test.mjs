import test from 'node:test';
import assert from 'node:assert/strict';
import { ShootoutScene } from '../football-scene.mjs';

function sceneForTest() {
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(target,key)=>key.startsWith('create')?()=>gradient:target[key]||(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
  globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
  const scene=new ShootoutScene({getContext:()=>ctx,setAttribute(){}},{textContent:'',className:''});
  scene.draw=()=>{};
  return scene;
}
test('slow rendering keeps the same real-time replay duration and resolves once',async()=>{
  for(const fps of [5,30,60]) {
    const scene=sceneForTest();const events=[];scene.onEvent=e=>events.push(e.type);
    const finished=scene.playReplay({shotZone:'top-right',keeperZone:'bottom-left',outcome:'goal'});
    const base=scene.lastTime;
    for(let frame=1;frame<=Math.ceil(4.4*fps);frame++) scene.loop(base+frame/fps*1000);
    assert.equal(scene.replay,null);assert.equal((await finished).cancelled,false);
    assert.equal(events.filter(x=>x==='impact').length,1);
    assert.equal(scene.resultStill.outcome,'goal');scene.destroy();
  }
});
test('pause freezes playback and resetting a replay cancels its pending result',async()=>{
  const scene=sceneForTest();const finished=scene.playReplay({outcome:'save',shotZone:'top-left',keeperZone:'top-left'});
  scene.updateReplay(1);scene.togglePause();scene.updateReplay(10);
  assert.equal(scene.replay.elapsed,1);
  scene.cancelReplay();assert.equal((await finished).cancelled,true);assert.equal(scene.replay,null);
  scene.destroy();
});
