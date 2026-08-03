import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  keeperMotionPlan,
  penaltyActionImpactPoint,
  penaltyBallPolishState,
  penaltyMissReboundPoint,
  penaltySaveDeflectionPoint
} from "../penalty-visuals.mjs";
import { cueProfile } from "../shootout-audio.mjs";

test("0.9H gives the travelling football perspective size, spin and a grounded shadow", () => {
  const early = penaltyBallPolishState({ shotZone: "top-right", outcome: "goal" }, 0.12);
  const late = penaltyBallPolishState({ shotZone: "top-right", outcome: "goal" }, 0.88);
  assert.ok(late.radius < early.radius);
  assert.ok(Math.abs(late.rotation) > Math.abs(early.rotation));
  assert.ok(late.shadow.y > late.y);
  assert.ok(late.shadow.opacity >= 0.07 && late.shadow.opacity <= 0.27);
});

test("0.9H keeps high and low ball shadows visually distinct", () => {
  const high = penaltyBallPolishState({ shotZone: "top-centre", outcome: "goal" }, 0.72);
  const low = penaltyBallPolishState({ shotZone: "bottom-centre", outcome: "goal" }, 0.72);
  assert.ok(high.y < low.y - 40);
  assert.ok(high.shadow.opacity < low.shadow.opacity);
});

test("0.9H blends the keeper from set position into side-specific dive frames", () => {
  const ready = keeperMotionPlan("top-left", 0.08, "goal");
  const left = keeperMotionPlan("top-left", 0.88, "goal");
  const right = keeperMotionPlan("top-right", 0.88, "goal");
  assert.deepEqual({ from: ready.fromIndex, to: ready.toIndex, phase: ready.phase }, { from: 0, to: 1, phase: "set" });
  assert.equal(left.toIndex, 3);
  assert.equal(left.direction, -1);
  assert.equal(right.toIndex, 2);
  assert.equal(right.direction, 1);
});

test("0.9H save deflections move away from the glove contact point", () => {
  for (const zone of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    const replay = { shotZone: zone, outcome: "save", kickIndex: 2 };
    const contact = penaltySaveDeflectionPoint(replay, 0);
    const finish = penaltySaveDeflectionPoint(replay, 1);
    const impact = penaltyActionImpactPoint(replay);
    assert.equal(Math.round(contact.x), Math.round(impact.x));
    assert.equal(Math.round(contact.y), Math.round(impact.y));
    assert.ok(Math.hypot(finish.x - contact.x, finish.y - contact.y) > 150);
  }
});

test("0.9H bar misses visibly rebound back into the field", () => {
  const left = { shotZone: "top-left", outcome: "miss", kickIndex: 1 };
  const right = { shotZone: "top-right", outcome: "miss", kickIndex: 1 };
  const leftContact = penaltyMissReboundPoint(left, 0);
  const leftFinish = penaltyMissReboundPoint(left, 1);
  const rightContact = penaltyMissReboundPoint(right, 0);
  const rightFinish = penaltyMissReboundPoint(right, 1);
  assert.ok(leftFinish.x > leftContact.x);
  assert.ok(rightFinish.x < rightContact.x);
  assert.ok(leftFinish.y > leftContact.y);
  assert.ok(rightFinish.y > rightContact.y);
});

test("0.9H uses frame blending, contact polish, ball shadows and elastic net oscillation", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  assert.match(source, /drawBlendedFullFrame/);
  assert.match(source, /drawContactPolish/);
  assert.match(source, /state\.shadow\.opacity/);
  assert.match(source, /oscillation = Math\.sin/);
  assert.match(source, /penaltySaveDeflectionPoint/);
  assert.match(source, /penaltyMissReboundPoint/);
});

test("0.9H synchronizes zone-aware net, glove and crossbar sound profiles", () => {
  const goal = cueProfile({ type: "impact", outcome: "goal", zone: "top-right" });
  const save = cueProfile({ type: "impact", outcome: "save", zone: "bottom-left" });
  const bar = cueProfile({ type: "impact", outcome: "miss", zone: "top-left" });
  const wide = cueProfile({ type: "impact", outcome: "miss", zone: "bottom-right" });
  assert.ok(goal.length >= 4);
  assert.ok(save.length >= 4);
  assert.ok(bar.some(cue => cue.kind === "tone" && cue.frequency >= 1000));
  assert.ok(!wide.some(cue => cue.kind === "tone" && cue.frequency >= 1000));
});

test("0.9H4 shortens the fixed-camera replay while preserving reduced-motion support", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  assert.match(source, /duration: this\.reducedMotion \? 1500 : 4400/);
});
