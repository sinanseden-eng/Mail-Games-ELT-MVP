import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PENALTY_ACTION_POINTS, penaltyActionFlightPoint, penaltyOutcomeCameraPlan } from "../penalty-visuals.mjs";

const zones = Object.keys(PENALTY_ACTION_POINTS.zones);

test("0.9G2 uses six distinct action-camera endpoints", () => {
  const points = zones.map(shotZone => penaltyActionFlightPoint({ shotZone, outcome: "goal" }, 1));
  assert.equal(new Set(points.map(point => `${Math.round(point.x)}|${Math.round(point.y)}`)).size, 6);
  for (const zone of zones) {
    const point = penaltyActionFlightPoint({ shotZone: zone, outcome: "goal" }, 1);
    assert.equal(Math.round(point.x), PENALTY_ACTION_POINTS.zones[zone].x);
    assert.equal(Math.round(point.y), PENALTY_ACTION_POINTS.zones[zone].y);
  }
});

test("0.9G2 keeps high and low shots visibly separated", () => {
  const high = penaltyActionFlightPoint({ shotZone: "top-centre", outcome: "goal" }, .62);
  const low = penaltyActionFlightPoint({ shotZone: "bottom-centre", outcome: "goal" }, .62);
  assert.ok(high.y < low.y - 45);
});

test("0.9G2 mirrors left outcome cameras and keeps outcome-specific assets", () => {
  assert.deepEqual(penaltyOutcomeCameraPlan({ shotZone: "top-left", outcome: "goal" }), { asset: "goal", mirror: true, label: "NET CAM" });
  assert.deepEqual(penaltyOutcomeCameraPlan({ shotZone: "top-right", outcome: "goal" }), { asset: "goal", mirror: false, label: "NET CAM" });
  assert.equal(penaltyOutcomeCameraPlan({ shotZone: "bottom-right", outcome: "save" }).asset, "save");
  assert.equal(penaltyOutcomeCameraPlan({ shotZone: "top-centre", outcome: "miss" }).asset, "miss");
});

test("0.9G2 uses full-frame ball, keeper and outcome cameras rather than an inset card", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const cinematic = source.slice(source.indexOf("  drawCinematic(ctx"), source.indexOf("\n  drawResultStill(ctx"));
  assert.match(cinematic, /BALL FLIGHT/);
  assert.match(cinematic, /fullFrame: true/);
  assert.match(cinematic, /penaltyOutcomeCameraPlan/);
  assert.match(source, /eraseEstablishingBall/);
});

test("0.9G2 goal impact bends net strands without a radar-wheel ellipse", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("  drawGoalImpact(ctx"), source.indexOf("\n  drawSaveImpact(ctx"));
  assert.match(block, /Net strands bend/);
  assert.match(block, /quadraticCurveTo/);
  assert.doesNotMatch(block, /ctx\.ellipse/);
});
