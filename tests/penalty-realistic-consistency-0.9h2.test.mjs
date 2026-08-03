import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalPenaltyZone,
  createPenaltyReplaySnapshot,
  zoneForCamera
} from "../penalty-perspective.mjs";
import {
  PENALTY_ACTION_POINTS,
  PenaltyVisualPack,
  penaltyActionImpactPoint,
  penaltyActionImpactPointForViewer
} from "../penalty-visuals.mjs";

const zones = [
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
];

test("0.9H2 creates a canonical replay snapshot without mutating the server event", () => {
  const event = { shotZone: "bottom-left", keeperZone: "top-right", outcome: "goal" };
  const before = structuredClone(event);
  const replay = createPenaltyReplaySnapshot(event, "keeper");
  assert.deepEqual(event, before);
  assert.equal(replay.canonicalShotZone, "bottom-left");
  assert.equal(replay.canonicalKeeperZone, "top-right");
  assert.equal(replay.viewerRole, "keeper");
});

test("0.9H2 mirrors only the keeper POV and restores the canonical main-camera side", () => {
  for (const shotZone of zones) {
    const replay = createPenaltyReplaySnapshot({ shotZone, keeperZone: "bottom-centre", outcome: "goal" }, "keeper");
    const keeperZone = zoneForCamera(replay, { field: "shotZone", cameraRole: "keeper" });
    const mainZone = zoneForCamera(replay, { field: "shotZone", cameraRole: "striker" });
    assert.equal(mainZone, shotZone);
    if (shotZone.endsWith("left")) assert.ok(keeperZone.endsWith("right"));
    if (shotZone.endsWith("right")) assert.ok(keeperZone.endsWith("left"));
    assert.equal(canonicalPenaltyZone(replay, "shotZone"), shotZone);
  }
});

test("0.9H2 canonical fields win even if a display layer accidentally changes shotZone", () => {
  const replay = createPenaltyReplaySnapshot({ shotZone: "top-left", keeperZone: "bottom-right", outcome: "goal" }, "keeper");
  replay.shotZone = "top-right";
  assert.equal(canonicalPenaltyZone(replay, "shotZone"), "top-left");
  assert.equal(zoneForCamera(replay, { cameraRole: "keeper" }), "top-right");
  assert.equal(zoneForCamera(replay, { cameraRole: "striker" }), "top-left");
  assert.deepEqual(
    { x: penaltyActionImpactPoint(replay).x, y: penaltyActionImpactPoint(replay).y },
    PENALTY_ACTION_POINTS.zones["top-left"]
  );
});

test("0.9H2 keeps keeper and main-camera endpoints role-correct across repeated rendering", () => {
  const replay = createPenaltyReplaySnapshot({ shotZone: "bottom-left", keeperZone: "bottom-right", outcome: "goal", progress: 0.72 }, "keeper");
  const keeperPoint1 = penaltyActionImpactPointForViewer(replay, "keeper");
  const mainPoint1 = penaltyActionImpactPointForViewer(replay, "striker");
  const keeperPoint2 = penaltyActionImpactPointForViewer(replay, "keeper");
  const mainPoint2 = penaltyActionImpactPointForViewer(replay, "striker");
  assert.deepEqual(keeperPoint1, keeperPoint2);
  assert.deepEqual(mainPoint1, mainPoint2);
  assert.notEqual(Math.round(keeperPoint1.x), Math.round(mainPoint1.x));
  assert.equal(replay.canonicalShotZone, "bottom-left");
});

test("0.9H2 uses restrained photographic impact language instead of comic bursts", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const goal = source.slice(source.indexOf("  drawGoalImpact(ctx"), source.indexOf("\n  drawSaveImpact(ctx"));
  const save = source.slice(source.indexOf("  drawSaveImpact(ctx"), source.indexOf("\n  drawMissImpact(ctx"));
  const miss = source.slice(source.indexOf("  drawMissImpact(ctx"), source.indexOf("\n  drawBallShadow(ctx"));
  const lookBack = source.slice(source.indexOf("  drawKeeperLookBack(ctx"), source.indexOf("\n  drawResultStill(ctx"));
  assert.match(source, /createRadialGradient/);
  assert.match(goal, /Net strands bend locally/);
  assert.match(goal, /drawBallShadow/);
  assert.doesNotMatch(goal, /impactGlow|shadowBlur|target ring/);
  assert.doesNotMatch(save, /rgba\(98,231,183|ctx\.arc\(point\.x/);
  assert.doesNotMatch(miss, /for \(let i = 0; i < 7|255,184,80/);
  assert.match(lookBack, /cameraRole: PENALTY_VIEWERS\.STRIKER/);
  assert.doesNotMatch(lookBack, /cameraRole: PENALTY_VIEWERS\.KEEPER/);
});

test("0.9H2 renders all goal zones in both perspectives without changing the event", () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  for (const shotZone of zones) {
    const replay = createPenaltyReplaySnapshot({ shotZone, keeperZone: "bottom-right", outcome: "goal", progress: 0.72 }, "keeper");
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1200, false, "keeper"));
    assert.doesNotThrow(() => pack.drawResultStill(ctx, replay, 1200, "keeper"));
    assert.equal(replay.canonicalShotZone, shotZone);
  }
  delete globalThis.Image;
});

function fakeContext() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "arcTo", "beginPath", "clearRect", "clip", "closePath", "drawImage", "ellipse",
    "fill", "fillRect", "fillText", "lineTo", "moveTo", "quadraticCurveTo", "restore",
    "rotate", "roundRect", "save", "scale", "setLineDash", "stroke", "strokeRect",
    "strokeText", "translate"
  ]);
  return new Proxy({}, {
    get(target, key) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}
