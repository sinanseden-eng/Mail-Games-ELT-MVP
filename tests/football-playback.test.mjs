import test from 'node:test';
import assert from 'node:assert/strict';
import { ShootoutScene } from '../football-scene.mjs';
import { TIMING } from '../football-motion.mjs';

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
test('a rendering stall or returning from a background tab cannot skip a penalty',async()=>{
  const scene=sceneForTest();const finished=scene.playReplay({outcome:'goal',shotZone:'top-right',keeperZone:'bottom-left'});
  const base=scene.lastTime;
  scene.loop(base+8000);
  assert.equal(scene.replay.elapsed,.25);
  assert.equal(scene.resultStill,null);
  // Ordinary 60 fps frames then show the complete kick, flight and result.
  for(let frame=1;frame<=240;frame++)scene.loop(base+8000+frame/60*1000);
  assert.equal((await finished).cancelled,false);
  assert.equal(scene.resultStill.outcome,'goal');scene.destroy();
});

test('reduced motion still renders the run-up, dive, flight and sagging net between start and finish',()=>{
  const scene=sceneForTest(), calls=[];
  const gradient={addColorStop(){}};
  scene.ctx=new Proxy({}, {
    get:(target,key)=>key.startsWith('create')?()=>gradient:target[key]||((...args)=>calls.push([key,...args])),
    set:(target,key,value)=>(target[key]=value,true)
  });
  const goal={outcome:'goal',shotZone:'middle-centre',keeperZone:'top-left'};
  function frame(time,reducedMotion) {
    calls.length=0;scene.reducedMotion=reducedMotion;
    scene.drawFrame(goal,time,time);
    return JSON.stringify(calls);
  }
  const ready=frame(0,true), finished=frame(TIMING.end,true);
  // Cover each essential phase. The old reduced-motion renderer returned
  // the starting pose before contact and the final pose at every later frame.
  for(const time of [.3,.7,1.3,TIMING.net+.12,2.1,3.1]) {
    const reduced=frame(time,true);
    assert.notEqual(reduced,ready,`missing motion at ${time}s`);
    assert.notEqual(reduced,finished,`jumped to the result at ${time}s`);
    assert.equal(reduced,frame(time,false),`essential motion differs at ${time}s`);
  }
  scene.destroy();
});

test('reduced-motion replays retain their duration and half speed doubles the viewing time',async()=>{
  for(const speed of [1,.5]) {
    const scene=sceneForTest();scene.reducedMotion=true;scene.speed=speed;
    const pending=scene.playReplay({outcome:'goal',shotZone:'top-right',keeperZone:'top-left'});
    const base=scene.lastTime;
    const frames=Math.floor(TIMING.end/speed*60);
    for(let frame=1;frame<frames;frame++)scene.loop(base+frame/60*1000);
    assert.ok(scene.replay,'replay finished before its full duration');
    scene.loop(base+(frames+1)/60*1000);
    assert.deepEqual(await pending,{cancelled:false});scene.destroy();
  }
});
