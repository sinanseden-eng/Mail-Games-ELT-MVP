import test from "node:test";
import assert from "node:assert/strict";
import { getZone } from "../shootout-core.mjs";
import { GOAL, SCENE_LAYOUT, createCamera, goalTargetWorld } from "../shootout-net.mjs";
import {
  REPLAY_TIMELINE,
  ballRenderScale,
  deterministicReplaySeed,
  keeperGroundContactOffset,
  missTargetWorld,
  sampleBallWorld,
  sampleKeeperMotion
} from "../shootout-physics.mjs";

const goalReplay = {
  kickIndex: 3,
  shotZone: "top-right",
  keeperZone: "bottom-left",
  shotActive: true,
  keeperActive: true,
  outcome: "goal",
  reason: "different-zone"
};

const saveReplay = {
  ...goalReplay,
  shotZone: "bottom-right",
  keeperZone: "bottom-right",
  outcome: "save",
  reason: "same-zone"
};

test("0.7.1 replay variation is deterministic across clients", () => {
  const first = deterministicReplaySeed(goalReplay);
  const second = deterministicReplaySeed({ ...goalReplay });
  assert.equal(first, second);
  assert.ok(first >= 0 && first <= 1);
});

test("0.7.1 high shots follow a raised arc before reaching the exact goal plane", () => {
  const middle = sampleBallWorld(goalReplay, (REPLAY_TIMELINE.strike + REPLAY_TIMELINE.goalPlane) / 2);
  const contact = sampleBallWorld(goalReplay, REPLAY_TIMELINE.goalPlane);
  const target = goalTargetWorld(getZone(goalReplay.shotZone));
  const straightMidY = (SCENE_LAYOUT.ballStart.y + target.y) / 2;
  assert.ok(middle.position.y > straightMidY + 0.35);
  assert.ok(Math.abs(contact.position.x - target.x) < 0.0001);
  assert.ok(Math.abs(contact.position.y - target.y) < 0.0001);
  assert.ok(Math.abs(contact.position.z) < 0.0001);
});

test("0.7.1 goal follow-through buries the ball behind the plane and settles it downward", () => {
  const impact = sampleBallWorld(goalReplay, REPLAY_TIMELINE.goalPlane + 0.03);
  const late = sampleBallWorld(goalReplay, 0.98);
  assert.ok(impact.position.z > 0);
  assert.ok(late.position.z > GOAL.depth * 0.35);
  assert.ok(late.position.y < impact.position.y);
  assert.equal(late.phase, "net-settle");
});

test("0.7.1 saves deflect the ball back toward the pitch", () => {
  const contact = sampleBallWorld(saveReplay, REPLAY_TIMELINE.keeperContact);
  const deflected = sampleBallWorld(saveReplay, 0.88);
  assert.ok(deflected.position.z < contact.position.z - 0.5);
  assert.equal(deflected.phase, "deflection");
});

test("0.7.1 inactive misses finish outside the frame or above the bar", () => {
  for (const id of ["top-left", "top-centre", "top-right", "bottom-left", "bottom-centre", "bottom-right"]) {
    const zone = getZone(id);
    const target = missTargetWorld(zone, { ...goalReplay, shotZone: id, outcome: "miss", shotActive: false });
    const outsidePosts = Math.abs(target.x) > GOAL.width / 2;
    const aboveBar = target.y > GOAL.height;
    assert.ok(outsidePosts || aboveBar, `${id} miss must clear the frame`);
  }
});

test("0.7.1 perspective makes the distant ball smaller", () => {
  const camera = createCamera();
  const startScale = ballRenderScale(camera, SCENE_LAYOUT.ballStart);
  const goalScale = ballRenderScale(camera, goalTargetWorld(getZone("bottom-centre")));
  assert.ok(goalScale < startScale);
});

test("0.7.1 active keeper launches and lands instead of sliding linearly", () => {
  const camera = createCamera();
  const air = sampleKeeperMotion(saveReplay, 0.40, camera);
  const landed = sampleKeeperMotion(saveReplay, 0.98, camera);
  assert.equal(air.airborne, true);
  assert.ok(air.stretch > 0.5);
  assert.ok(landed.landing > 0.9);
  assert.ok(landed.squash > 0.02);
});



test("0.7.1a keeper settles onto the projected pitch instead of hovering after a save", () => {
  const camera = createCamera();
  for (const id of ["top-left", "top-centre", "top-right", "bottom-left", "bottom-centre", "bottom-right"]) {
    const replay = { ...saveReplay, shotZone: id, keeperZone: id };
    const landed = sampleKeeperMotion(replay, 1, camera);
    const target = goalTargetWorld(getZone(id));
    const pitch = camera.project({ x: target.x, y: 0, z: SCENE_LAYOUT.keeperBase.z });
    const lowestBodyPoint = landed.y + keeperGroundContactOffset(landed);
    assert.ok(Math.abs((pitch.y - lowestBodyPoint) - 3) < 0.001, `${id} landing gap was ${pitch.y - lowestBodyPoint}`);
    assert.ok(Math.abs(landed.shadowY - pitch.y) < 0.001, `${id} shadow left the pitch`);
    assert.equal(landed.airborne, false);
  }
});

test("0.7.1 flight remains continuous at goal, save and miss contact", () => {
  const cases = [
    goalReplay,
    saveReplay,
    { ...goalReplay, shotZone: "bottom-centre", outcome: "miss", reason: "inactive-shot", shotActive: false }
  ];
  for (const replay of cases) {
    const contactTime = replay.outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
    const before = sampleBallWorld(replay, contactTime - 0.0001).position;
    const at = sampleBallWorld(replay, contactTime).position;
    const jump = Math.hypot(before.x - at.x, before.y - at.y, before.z - at.z);
    assert.ok(jump < 0.01, `${replay.outcome} contact jump was ${jump}`);
  }
});
