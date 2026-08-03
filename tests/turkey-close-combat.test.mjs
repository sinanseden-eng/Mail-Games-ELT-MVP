import test from "node:test";
import assert from "node:assert/strict";
import { TurkeyFightScene, turkeyAttackTravel, turkeyChoreography } from "../turkey-scene.mjs";

test("0.8b moves enlarged fighters from a wide stance into close-combat range", () => {
  const idle = turkeyChoreography(0, "idle");
  const contact = turkeyChoreography(0.38, "replay");
  assert.ok(idle.B.x - idle.A.x >= 540);
  assert.ok(contact.B.x - contact.A.x <= 375);
  assert.ok(contact.A.scale >= 1.19);
  assert.ok(contact.B.scale >= 1.19);
  assert.equal(turkeyAttackTravel("wing-slap"), 100);
  assert.equal(turkeyAttackTravel("peck"), 118);
  assert.equal(turkeyAttackTravel("charge"), 175);
});

test("0.8b raises a defence during the incoming attack beat", () => {
  const scene = new TurkeyFightScene(null, null, { reducedMotion: true });
  scene.mode = "replay";
  scene.replay = {
    moveA: "wing-slap", moveB: "block", activeA: true, activeB: true,
    damageToA: 0, damageToB: 0, completed: false
  };
  scene.progress = 0.38;
  let state = scene.sceneState();
  assert.ok(Math.sin(Math.PI * state.A.action) > 0.95);
  assert.ok(Math.sin(Math.PI * state.B.guard) > 0.95);

  scene.replay = {
    moveA: "counter", moveB: "peck", activeA: true, activeB: true,
    damageToA: 0, damageToB: 0, completed: false
  };
  scene.progress = 0.70;
  state = scene.sceneState();
  assert.ok(Math.sin(Math.PI * state.B.action) > 0.95);
  assert.ok(Math.sin(Math.PI * state.A.guard) > 0.95);
});
