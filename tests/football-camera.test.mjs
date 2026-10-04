import test from 'node:test';
import assert from 'node:assert/strict';
import { TIMING, TARGETS, replaySnapshot } from '../football-motion.mjs';
import { NET_DEPTH, TV_BALL_START, TV_TARGETS, projectPitch, projectGoalPoint, targetAtScreen, tvKeeperPose, tvNetPoint, tvBallAt, tvStrikerPose } from '../football-camera.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('TV angle places the goal left of the penalty spot with a visible rear cage',()=>{
  const near=projectPitch(0),far=projectPitch(1),rear=projectPitch(0,NET_DEPTH);
  assert.ok(near.x<far.x && far.x<TV_BALL_START.x);
  assert.ok(far.y<near.y && rear.x<near.x);
  assert.ok(projectPitch(0,0,1).y<near.y);
  assert.ok(tvStrikerPose(0,false).root.x>TV_BALL_START.x);
});

test('every goal target can be selected at its projected location and pitch clicks are ignored',()=>{
  for(const target of TV_TARGETS) assert.equal(targetAtScreen(target.x,target.y)?.id,target.id);
  for(const point of [TV_BALL_START,{x:1100,y:550},{x:20,y:20},{x:640,y:600}]) assert.equal(targetAtScreen(point.x,point.y),null);
});

test('striker makes boot contact and shots reach all nine projected targets',()=>{
  assert.ok(distance(tvStrikerPose(TIMING.kick,true).boot,TV_BALL_START)<1e-9);
  for(const target of TARGETS) {
    const round=replaySnapshot({shotZone:target.id,keeperZone:target.id,outcome:'save'});
    assert.ok(distance(tvBallAt(round,TIMING.kick),TV_BALL_START)<1e-9);
    assert.ok(distance(tvBallAt(round,TIMING.contact),projectGoalPoint(target))<1e-9);
    for(const time of [1.59,1.85,2.32,4.2]) {
      const pose=tvKeeperPose(round,time), ball=tvBallAt(round,time);
      assert.ok(distance(ball,{x:(pose.wl.x+pose.wr.x)/2,y:(pose.wl.y+pose.wr.y)/2})<1e-9);
    }
  }
});

test('projected net stays pinned and the ball follows its visible impact pocket',()=>{
  const round=replaySnapshot({shotZone:'middle-centre',outcome:'goal'});
  for(const [u,v] of [[0,.5],[1,.5],[.5,0],[.5,1]]) {
    assert.ok(distance(tvNetPoint(u,v,null,0),tvNetPoint(u,v,round,1.85,1.85))<1e-9);
  }
  const base=tvNetPoint(.5,.52,null,0),impact=tvNetPoint(.5,.52,round,1.85,1.3);
  assert.ok(impact.x<base.x-10 && impact.y>base.y+5);
  assert.ok(distance(tvBallAt(round,1.85,1.3),impact)<1e-9);
  assert.ok(distance(tvBallAt(round,TIMING.net-.000001),tvBallAt(round,TIMING.net+.000001))<.01);
  for(const outcome of ['save','parry','miss']) assert.deepEqual(tvNetPoint(.5,.52,{...round,outcome},1.85),base);
});

test('camera samples remain finite for every outcome, direction and keeper choice',()=>{
  for(const shot of TARGETS) for(const keeper of TARGETS) for(const outcome of ['goal','save','parry','miss']) {
    const round=replaySnapshot({shotZone:shot.id,keeperZone:keeper.id,outcome});
    for(let frame=0;frame<=126;frame++) {
      const time=frame/30,ball=tvBallAt(round,time),pose=tvKeeperPose(round,time);
      for(const value of [ball.x,ball.y,ball.r,...Object.values(pose).flatMap(p=>[p.x,p.y])]) assert.ok(Number.isFinite(value));
    }
  }
});
