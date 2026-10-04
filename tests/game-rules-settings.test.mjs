import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTurn,defaultState} from '../game-engine.mjs';
import {footballFinished,gameSettings} from '../game-rules.mjs';
import {advanceAfterReplay,createInitialShootoutState} from '../shootout-core.mjs';
test('sudden death ends only after equal kicks, with a finite teacher-selected limit',()=>{
  const state={kickIndex:10,scoreA:5,scoreB:5,tieMode:'sudden-death',extraPairs:3};
  assert.equal(footballFinished(state),false);assert.equal(footballFinished({...state,kickIndex:11,scoreA:6}),false);assert.equal(footballFinished({...state,kickIndex:12,scoreA:6}),true);assert.equal(footballFinished({...state,kickIndex:16}),true);
  assert.equal(advanceAfterReplay({...createInitialShootoutState({tieMode:'sudden-death'}),kickIndex:9}).finished,false);
});
test('defending indefinitely produces a draw at the Turkey round limit',()=>{let state=defaultState('turkey',{maxRounds:3});for(let round=0;round<3;round++)for(const actor of ['A','B'])state=applyTurn('turkey',state,{actor,move:'block',answerCorrect:true}).state;assert.equal(state.finished,true);assert.equal(state.winner,null);assert.equal(state.history.length,3);});
test('Counter blocks active charge and returns eight damage; inactive counters do nothing',()=>{for(const active of [true,false]){let s=defaultState('turkey');s=applyTurn('turkey',s,{actor:'A',move:'counter',answerCorrect:active}).state;s=applyTurn('turkey',s,{actor:'B',move:'charge',answerCorrect:true}).state;assert.equal(s.healthA,active?100:78);assert.equal(s.healthB,active?92:100);}});
test('teacher settings reject unsupported and unbounded values',()=>{assert.throws(()=>gameSettings('turkey',{maxRounds:0}));assert.throws(()=>gameSettings('sniper',{maxRounds:500}));assert.throws(()=>gameSettings('penalty',{tieMode:'forever'}));assert.throws(()=>gameSettings('penalty',{extraPairs:2.5}));});
