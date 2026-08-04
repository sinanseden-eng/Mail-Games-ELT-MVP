import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

const exactSpots = {
  "top-left": { x: 184, y: 341 },
  "top-centre": { x: 300, y: 311 },
  "top-right": { x: 419, y: 287 },
  "bottom-left": { x: 189, y: 487 },
  "bottom-centre": { x: 318, y: 457 },
  "bottom-right": { x: 423, y: 420 }
};

test("0.9H5 pages load the final broadcast module chain", async () => {
  const [turn, replay, demo] = await Promise.all([read("turn.html"), read("replay.html"), read("shootout.html")]);
  assert.match(turn, /turn-0\.9h5(?:a)?\.js/);
  assert.match(replay, /replay-0\.9h5(?:a)?\.js/);
  assert.match(demo, /shootout-0\.9h5(?:a)?\.js/);
  const scene = await read("shootout-scene-0.9h5.mjs");
  assert.match(scene, /penalty-visuals-0\.9h5\.mjs/);
  assert.match(scene, /shootout-physics-0\.9h5\.mjs/);
});

test("0.9H5 preserves the six exact user-marked target centres", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5.mjs", import.meta.url));
  assert.deepEqual(visuals.BROADCAST_SELECTION_POINTS.zones, exactSpots);
});

test("0.9H5 striker plants before contact and remains anchored to the pitch", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5.mjs", import.meta.url));
  const physics = await import(new URL("../shootout-physics-0.9h5.mjs", import.meta.url));
  const replay = { outcome: "goal", shotZone: "bottom-right", keeperZone: "top-left" };
  const approach = visuals.singleAngleStrikerState(replay, 0.10);
  const plant = visuals.singleAngleStrikerState(replay, physics.REPLAY_TIMELINE.plantStart + 0.02);
  const contact = visuals.singleAngleStrikerState(replay, physics.REPLAY_TIMELINE.strike);
  const follow = visuals.singleAngleStrikerState(replay, physics.REPLAY_TIMELINE.strike + 0.12);
  assert.ok(plant.plantT > approach.plantT);
  assert.ok(contact.contactEnvelope > 0.98);
  assert.ok(follow.followT > contact.followT);
  for (const state of [approach, plant, contact, follow]) {
    const reconstructedFootY = state.contact.y + state.contact.height * state.contact.originY;
    assert.ok(Math.abs(reconstructedFootY - state.foot.y) < 0.001);
    assert.ok(state.foot.y >= 548 && state.foot.y <= 604);
  }
});

test("0.9H5 keeper stages anticipation, push-off, extension and landing", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5.mjs", import.meta.url));
  const physics = await import(new URL("../shootout-physics-0.9h5.mjs", import.meta.url));
  const replay = { outcome: "save", shotZone: "top-left", keeperZone: "top-left" };
  const set = visuals.singleAngleKeeperState(replay, physics.REPLAY_TIMELINE.anticipationStart + 0.02);
  const launch = visuals.singleAngleKeeperState(replay, physics.REPLAY_TIMELINE.keeperTakeoff + 0.04);
  const extension = visuals.singleAngleKeeperState(replay, physics.REPLAY_TIMELINE.keeperContact - 0.01);
  const landing = visuals.singleAngleKeeperState(replay, physics.REPLAY_TIMELINE.settleStart);
  assert.ok(set.anticipation > 0);
  assert.ok(launch.pushOff > 0);
  assert.ok(extension.extension > launch.extension);
  assert.ok(landing.landing > 0.9);
  assert.equal(extension.direction, -1);
});

test("0.9H5 ball keeps exact endpoints and uses physical post, save and net responses", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5.mjs", import.meta.url));
  const physics = await import(new URL("../shootout-physics-0.9h5.mjs", import.meta.url));

  const goalReplay = { outcome: "goal", shotZone: "top-right", keeperZone: "bottom-left", kickIndex: 2 };
  const goalContact = visuals.singleAngleBallState(goalReplay, physics.REPLAY_TIMELINE.goalPlane);
  const goalSettle = visuals.singleAngleBallState(goalReplay, 0.92);
  assert.equal(goalContact.target.x, exactSpots["top-right"].x);
  assert.equal(goalContact.target.y, exactSpots["top-right"].y);
  assert.ok(goalSettle.y > goalContact.target.y);
  assert.ok(goalSettle.radius < goalContact.radius);

  const saveReplay = { outcome: "save", shotZone: "bottom-left", keeperZone: "bottom-left", kickIndex: 3 };
  const saveContact = visuals.singleAngleBallState(saveReplay, physics.REPLAY_TIMELINE.keeperContact);
  const saveDeflect = visuals.singleAngleBallState(saveReplay, 0.82);
  assert.ok(saveContact.contactCompression > 0.98);
  assert.ok(saveDeflect.x > saveContact.target.x);
  assert.ok(saveDeflect.radius > saveContact.radius);

  const frameReplay = { outcome: "miss", shotZone: "top-left", keeperZone: "bottom-right", kickIndex: 4 };
  const frameContact = visuals.singleAngleBallState(frameReplay, physics.REPLAY_TIMELINE.goalPlane);
  const frameRebound = visuals.singleAngleBallState(frameReplay, 0.88);
  assert.equal(frameContact.missImpactKind, "frame");
  assert.ok(frameRebound.x > frameContact.target.x);
  assert.ok(frameRebound.y > frameContact.target.y);
  assert.ok(frameRebound.radius > frameContact.radius);
});

test("0.9H5 delays result storytelling until the physical outcome is visible", async () => {
  const physics = await import(new URL("../shootout-physics-0.9h5.mjs", import.meta.url));
  const timeline = physics.REPLAY_TIMELINE;
  assert.ok(timeline.keeperTakeoff > timeline.strike);
  assert.ok(timeline.resultReveal - timeline.goalPlane >= 0.10);
  assert.ok(timeline.settleStart > timeline.resultReveal);
  const scene = await read("shootout-scene-0.9h5.mjs");
  assert.match(scene, /duration: this\.reducedMotion \? 1400 : 4050/);
  assert.match(scene, /keeper-takeoff/);
  assert.match(scene, /this\.emit\("settle"/);
});

test("0.9H5 synchronizes keeper launch and physical settling audio", async () => {
  const audio = await import(new URL("../shootout-audio-0.9h5.mjs", import.meta.url));
  const takeoff = audio.cueProfile({ type: "keeper-takeoff", zone: "top-left", outcome: "goal" });
  const settle = audio.cueProfile({ type: "settle", zone: "bottom-right", outcome: "goal" });
  assert.ok(takeoff.length >= 2);
  assert.ok(settle.length >= 2);
  const visuals = await read("penalty-visuals-0.9h5.mjs");
  assert.match(visuals, /drawBallMotionBlur\(ctx, ball, 0\.075\)/);
  assert.doesNotMatch(visuals.slice(visuals.indexOf("drawSingleAngleCinematic"), visuals.indexOf("drawSingleAngleKeeper")), /const ghost = singleAngleBallState/);
});
