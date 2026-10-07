import test from 'node:test';
import assert from 'node:assert/strict';
import {replayMotionPreference,saveReplayMotion,hasNewReplay} from '../classroom-playback.mjs';

test('an explicit full animation choice overrides the device preference and persists',()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(replayMotionPreference(storage,true),true);
  saveReplayMotion(storage,false);
  assert.equal(replayMotionPreference(storage,true),false);
  saveReplayMotion(storage,true);
  assert.equal(replayMotionPreference(storage,false),true);
});
test('blocked preference storage still respects the system preference',()=>{
  const storage={getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}};
  assert.equal(replayMotionPreference(storage,true),true);
  assert.doesNotThrow(()=>saveReplayMotion(storage,false));
});
test('the waiting player replays only a newly completed round, including the final round',()=>{
  const previous={id:'match',history:[{outcome:'goal'}]};
  assert.equal(hasNewReplay(previous,{...previous,history:[...previous.history,{outcome:'save'}],finished:true}),true);
  assert.equal(hasNewReplay(previous,{...previous,version:3}),false);
  assert.equal(hasNewReplay(previous,{...previous,history:[],version:4}),false);
  assert.equal(hasNewReplay(previous,{...previous,id:'other',history:[{},{}]}),false);
  assert.equal(hasNewReplay(previous,{...previous,cancelled:true,history:[{},{}]}),false);
});
