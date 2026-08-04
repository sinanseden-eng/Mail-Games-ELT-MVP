import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("0.9H4D accuracy modules remain packaged after later motion passes", async () => {
  for (const file of ["turn-0.9h4d.js", "replay-0.9h4d.js", "shootout-0.9h4d.js", "shootout-scene-0.9h4d.mjs", "penalty-visuals-0.9h4d.mjs"]) {
    const info = await stat(new URL(`../${file}`, import.meta.url));
    assert.ok(info.size > 100, `${file} remains available for regression comparison`);
  }
});

test("0.9H4D uses the exact six black-X target centres", async () => {
  const module = await import(new URL("../penalty-visuals-0.9h4d.mjs", import.meta.url));
  assert.deepEqual(module.BROADCAST_SELECTION_POINTS.zones, {
    "top-left": { x: 184, y: 341 },
    "top-centre": { x: 300, y: 311 },
    "top-right": { x: 419, y: 287 },
    "bottom-left": { x: 189, y: 487 },
    "bottom-centre": { x: 318, y: 457 },
    "bottom-right": { x: 423, y: 420 }
  });
});

test("0.9H4D ball starts at the photographed broadcast ball and stays match-sized", async () => {
  const module = await import(new URL("../penalty-visuals-0.9h4d.mjs", import.meta.url));
  const replay = { outcome: "goal", shotZone: "top-right", keeperZone: "bottom-left", kickIndex: 2 };
  const before = module.singleAngleBallState(replay, 0.1);
  const flight = module.singleAngleBallState(replay, 0.63);
  assert.deepEqual(before.start, { x: 939, y: 530 });
  assert.ok(before.radius <= 10.7);
  assert.ok(flight.radius < before.radius);
  assert.deepEqual(flight.target, { x: 419, y: 287, label: "top right" });
});

test("0.9H4D grounds the striker by the planted foot", async () => {
  const module = await import(new URL("../penalty-visuals-0.9h4d.mjs", import.meta.url));
  const replay = { outcome: "goal", shotZone: "bottom-centre", keeperZone: "top-left" };
  for (const progress of [0, 0.1, 0.2, 0.3, 0.4]) {
    const state = module.singleAngleStrikerState(replay, progress);
    const reconstructedFootY = state.contact.y + state.contact.height * state.contact.originY;
    assert.ok(Math.abs(reconstructedFootY - state.foot.y) < 0.001);
    assert.ok(state.foot.y >= 548 && state.foot.y <= 602);
  }
});

test("0.9H4D packages and invokes the photographed match-ball asset", async () => {
  const visuals = await read("penalty-visuals-0.9h4d.mjs");
  assert.match(visuals, /realistic-ball-0\.9h4d\.png/);
  assert.match(visuals, /const photographedBall = this\.get/);
  const info = await stat(new URL("../assets/penalty-single-angle/realistic-ball-0.9h4d.png", import.meta.url));
  assert.ok(info.size > 10_000);
});
