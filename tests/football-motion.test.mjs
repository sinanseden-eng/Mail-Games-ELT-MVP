import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, TIMING, BALL_START, targetFor, replaySnapshot, keeperPose, ballAt, netPoint, netBase } from '../football-motion.mjs';
import { applyRoundResult, createInitialShootoutState, resolvePenaltyRound } from '../shootout-core.mjs';
import { readFile } from 'node:fs/promises';

test('canonical replay directions stay independent and input is never mutated', () => {
  const input=Object.freeze({shotZone:'bottom-right',canonicalShotZone:'TOP_LEFT',keeperZone:'middle-right',outcome:'goal',keeperActive:false});
  const round=replaySnapshot(input);
  assert.equal(round.shotZone,'top-left'); assert.equal(round.keeperZone,'middle-right');
  assert.equal(round.keeperActive,false); assert.equal(input.shotZone,'bottom-right'); assert.ok(Object.isFrozen(round));
  assert.equal(targetFor('top-center').id,'top-centre');
});

test('the ball starts at the boot and reaches each of nine selected targets at contact', () => {
  for(const target of TARGETS) {
    const round=replaySnapshot({shotZone:target.id,keeperZone:target.id,outcome:'save'});
    assert.deepEqual(ballAt(round,TIMING.kick),BALL_START);
    const ball=ballAt(round,TIMING.contact);
    assert.ok(Math.abs(ball.x-target.x)<.001); assert.ok(Math.abs(ball.y-target.y)<.001);
    for(const time of [1.6,1.9,2.4,4.2]) {
      const held=ballAt(round,time), pose=keeperPose(round,time);
      assert.equal(held.x,(pose.wl.x+pose.wr.x)/2);
      assert.equal(held.y,(pose.wl.y+pose.wr.y)/2);
    }
  }
});

test('keeper pushes off into a changed body pose and lands on both sides', () => {
  for(const side of ['left','right']) {
    const round=replaySnapshot({outcome:'save',shotZone:`top-${side}`,keeperZone:`top-${side}`});
    const ready=keeperPose(round,0), reach=keeperPose(round,TIMING.contact), land=keeperPose(round,TIMING.end);
    assert.ok(reach.hip.y<ready.hip.y-70);
    assert.ok(Math.abs(reach.chest.x-reach.hip.x)>35);
    assert.ok(Math.abs(reach.wl.x-reach.al.x)>150);
    assert.ok(land.hip.y>=395); assert.ok(land.head.y<land.hip.y);
    assert.ok(land.al.y<=415 && land.ar.y<=415);
  }
});

test('net is pinned at its borders, deforms locally only for goals, and settles', () => {
  const goal=replaySnapshot({shotZone:'middle-centre',outcome:'goal'});
  const age=TIMING.net+.12;
  for(const [u,v] of [[0,.4],[1,.4],[.4,0],[.4,1]]) {
    const base=netBase(u,v), moved=netPoint(u,v,goal,age);
    assert.ok(Math.hypot(moved.x-base.x,moved.y-base.y)<1e-10);
  }
  const base=netBase(.5,.52), moved=netPoint(.5,.52,goal,age), far=netPoint(.1,.1,goal,age);
  assert.ok(Math.hypot(moved.x-base.x,moved.y-base.y)>5);
  assert.ok(Math.hypot(far.x-netBase(.1,.1).x,far.y-netBase(.1,.1).y)<2);
  for(const outcome of ['save','miss','parry']) assert.deepEqual(netPoint(.5,.52,{...goal,outcome},age),base);
  const settled=netPoint(.5,.52,goal,TIMING.end);
  assert.ok(Math.hypot(settled.x-base.x,settled.y-base.y)<1);
});

test('ball presses into the moving net, drops, and never jumps through its floor', () => {
  for(const target of TARGETS) {
    const round=replaySnapshot({shotZone:target.id,outcome:'goal'});
    for(const sag of [.65,1.3,1.85]) {
      const before=ballAt(round,TIMING.net,sag);
      const after=ballAt(round,TIMING.net+.000001,sag);
      assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.01);
      const resting=ballAt(round,TIMING.end,sag);
      assert.ok(resting.y<403 && resting.y>382);
      if(target.id.startsWith('top')) assert.ok(resting.y-before.y>140);
    }
  }
});

test('all directions and outcomes produce finite continuous animation samples', () => {
  for(const shot of TARGETS) for(const keeper of TARGETS) for(const outcome of ['goal','save','miss','parry']) {
    const round=replaySnapshot({shotZone:shot.id,keeperZone:keeper.id,outcome});
    for(let frame=0;frame<=126;frame++) {
      const t=frame/30;
      const ball=ballAt(round,t), pose=keeperPose(round,t);
      for(const value of [ball.x,ball.y,ball.r,...Object.values(pose).flatMap(p=>[p.x,p.y])]) assert.ok(Number.isFinite(value));
    }
  }
});

test('misses clear the posts or bar; parries go away from the goal', () => {
  for(const target of TARGETS) {
    const miss=ballAt({shotZone:target.id,outcome:'miss'},TIMING.contact);
    assert.ok(miss.x<300 || miss.x>980 || miss.y<170);
    const parry=ballAt({shotZone:target.id,outcome:'parry'},2.65);
    assert.ok(Math.abs(parry.x-target.x)>190); assert.ok(parry.y>414);
  }
});

test('answer-gated scoring and inactive moves survive the stored result', () => {
  const state={...createInitialShootoutState(),shotZone:'top-left',keeperZone:'top-right',shotActive:true,keeperActive:false};
  const result=resolvePenaltyRound(state), next=applyRoundResult(state,result);
  assert.equal(next.scoreA,1); assert.equal(next.lastResult.keeperActive,false); assert.equal(next.lastResult.shotActive,true);
  assert.equal(resolvePenaltyRound({...state,shotActive:false}).goal,false);
  assert.equal(resolvePenaltyRound({...state,keeperActive:true,keeperZone:'top-left'}).outcome,'save');
});

test('classroom, practice and email replay all use the new renderer', async () => {
  for(const file of ['classroom.mjs','football.mjs','shootout-0.9h5a2.js','turn-0.9h5a2.js','replay-0.9h5a2.js']) {
    const source=await readFile(new URL(`../${file}`,import.meta.url),'utf8');
    assert.match(source,/from ['"]\.\/football-player\.mjs['"]/);
    assert.doesNotMatch(source,/import.*blender|from.*shootout-scene-/);
  }
});
