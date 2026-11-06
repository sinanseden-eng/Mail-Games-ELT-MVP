import test from "node:test";
import assert from "node:assert/strict";
import { SNIPER_SPOTS, sniperPosition, sniperRecentPositions, sniperShotExplanation } from "../sniper-core.mjs";
import { sniperGuideMarkup, sniperHistoryMarkup, sniperResultMarkup } from "../sniper-ui.mjs";
import { applyTurn, defaultState } from "../game-engine.mjs";

const frames = [];
globalThis.requestAnimationFrame = callback => frames.push(callback);
const { SniperScene, SNIPER_REPLAY_TIMELINE: timeline } = await import("../sniper-scene.mjs");
const replay = {
  gameType: "sniper", round: 1, emergenceA: "rooftop", emergenceB: "rooftop",
  targetA: "rooftop", targetB: "upper-window", activeA: true, activeB: true,
  hitByA: true, hitByB: false, healthA: 3, healthB: 2
};

test("identical cover choices live on opposite sides and shots cross between them", () => {
  for (const id of SNIPER_SPOTS) {
    const a = sniperPosition("A", id), b = sniperPosition("B", id);
    assert.ok(a.x < 0.5 && b.x > 0.5);
    assert.ok(b.x - a.x >= 0.1);
    assert.equal(a.number, b.number);
  }
  const scene = new SniperScene(null);
  scene.replay = replay;
  assert.ok(scene.actorMuzzle("A", "rooftop", "rooftop").x < scene.impactPoint("A", "rooftop", true).x);
  assert.ok(scene.actorMuzzle("B", "rooftop", "rooftop").x > scene.impactPoint("B", "rooftop", true).x);
});

test("map taps choose own cover or opponent prediction for either player", () => {
  const selected = [];
  const scene = new SniperScene({style:{},addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})}, null, {onSelect:choice=>selected.push(choice)});
  for (const actor of ["A", "B"]) {
    scene.setIdle({actor});
    for (const side of ["A", "B"]) {
      const p = sniperPosition(side, "upper-window");
      scene.handleMapClick({clientX:p.x*1280,clientY:p.y*720});
      assert.deepEqual(selected.at(-1), {kind:side===actor?"emergence":"target",spot:"upper-window"});
    }
  }
  const count = selected.length;
  scene.mode = "replay";
  scene.handleMapClick({clientX:0,clientY:0});
  assert.equal(selected.length, count);
});

test("history contains only the last three resolved opponent locations", () => {
  const history = ["Player A locked choices", ...[1,2,3,4].map(round=>({...replay,round,emergenceB:SNIPER_SPOTS[round-1]})), {gameType:"sniper",emergenceA:"supply-crates"}];
  assert.deepEqual(sniperRecentPositions(history,"A"), [
    {round:2,spot:"upper-window"},{round:3,spot:"broken-wall"},{round:4,spot:"supply-crates"}
  ]);
  assert.equal(sniperRecentPositions(history,"B")[0].spot,"rooftop");
  assert.doesNotMatch(sniperHistoryMarkup(history,"A"), /Player A locked choices/);
});

test("reduced motion preserves reading time, synchronized events and a usable skip", async () => {
  frames.length = 0;
  const events=[];
  const scene = new SniperScene(null,null,{reducedMotion:true,onEvent:event=>events.push({...event,p:scene.progress})});
  frames.length=0;
  let finished=false;
  const playing=scene.playReplay(replay).then(()=>{finished=true;});
  assert.equal(scene.progress,0);
  assert.ok(scene.duration>=6000);
  const advance=p=>{const tick=frames.shift();assert.ok(tick);tick(scene.startedAt+scene.duration*p);};
  advance(timeline.shotAStart-0.001);
  await Promise.resolve();assert.equal(finished,false);
  assert.equal(events.filter(e=>e.type==='shot').length,0);
  advance(timeline.shotAStart);
  assert.deepEqual(events.filter(e=>e.type==='shot').map(e=>e.actor),['A','B']);
  advance(timeline.shotAImpact);
  assert.deepEqual(events.filter(e=>e.type==='impact').map(e=>e.actor),['A','B']);
  assert.deepEqual(scene.cameraShake(1000),{x:0,y:0});
  assert.equal(scene.replayCamera(1000).zoom,1);
  scene.skipReplay();
  advance(1);
  await playing;
  assert.equal(finished,true);
  assert.equal(events.filter(e=>e.type==='result').length,1);
});

test("both players running out of lives before the limit is explicitly a draw", () => {
  let state={...defaultState('sniper'),healthA:1,healthB:1};
  state=applyTurn('sniper',state,{actor:'A',emergence:'rooftop',target:'rooftop',answerCorrect:true}).state;
  const result=applyTurn('sniper',state,{actor:'B',emergence:'rooftop',target:'rooftop',answerCorrect:true});
  assert.equal(result.completed,true);assert.equal(result.replay.winner,null);
  assert.match(result.replay.caption,/DRAW.*both players ran out of lives/);
});

test("a disabled shot is not described as a missed prediction", () => {
  let state=applyTurn('sniper',defaultState('sniper'),{actor:'A',emergence:'rooftop',target:'broken-wall',answerCorrect:false}).state;
  const result=applyTurn('sniper',state,{actor:'B',emergence:'broken-wall',target:'upper-window',answerCorrect:true});
  assert.equal(result.replay.caption,'NO TAG — the active shot missed.');
});

test("pause freezes progress and leaving a replay cancels its remaining events", async () => {
  frames.length=0;
  const events=[];
  const scene=new SniperScene(null,null,{onEvent:event=>events.push(event)});
  frames.length=0;
  const playing=scene.playReplay(replay);
  frames.shift()(scene.startedAt+scene.duration*0.2);
  const before=scene.progress;
  assert.equal(scene.togglePause(),true);
  frames.shift()(scene.startedAt+scene.duration*0.6);
  assert.equal(scene.progress,before);
  assert.equal(scene.togglePause(),false);
  scene.setIdle({actor:'B'});
  frames.shift()(scene.startedAt+scene.duration);
  await playing;
  assert.equal(scene.mode,'idle');
  assert.equal(events.filter(event=>event.type==='shot'||event.type==='result').length,0);
});

test("the briefing and results explain lives, wrong answers and predictions", () => {
  assert.match(sniperGuideMarkup(8,true),/up to 8 rounds/);
  assert.match(sniperGuideMarkup(8),/equal lives means a draw/);
  assert.match(sniperShotExplanation(replay,'A'),/Hit: guessed 1/);
  assert.match(sniperShotExplanation({...replay,activeA:false},'A'),/incorrect English answer/);
  assert.match(sniperResultMarkup(replay),/Lives remaining/);
});
