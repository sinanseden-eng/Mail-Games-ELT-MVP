import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  KEEPER_ACTION_POINTS,
  PenaltyVisualPack,
  keeperNaturalActionState
} from "../penalty-visuals.mjs";

const zones = [
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
];

test("0.9H2C moves the real ball toward every canonical goal coordinate", () => {
  for (const shotZone of zones) {
    const replay = { shotZone, keeperZone: "bottom-centre", outcome: "goal", kickIndex: 2 };
    const early = keeperNaturalActionState(replay, 0.28);
    const impact = keeperNaturalActionState(replay, early.contact);
    assert.ok(Math.hypot(impact.x - impact.target.x, impact.y - impact.target.y) < 0.001);
    assert.deepEqual(
      { x: impact.target.x, y: impact.target.y },
      KEEPER_ACTION_POINTS.zones[shotZone]
    );
    assert.equal(replay.shotZone, shotZone);
  }
});

test("0.9H2C animates keeper dive and shot destination independently", () => {
  const replay = { shotZone: "bottom-left", keeperZone: "top-right", outcome: "goal", kickIndex: 3 };
  const state = keeperNaturalActionState(replay, 0.57);
  assert.equal(state.keeperZone, "top-right");
  assert.equal(state.target.x, KEEPER_ACTION_POINTS.zones["bottom-left"].x);
  assert.ok(state.diveT > 0.8);
  assert.ok(state.flightT > 0.8);
});

test("0.9H2C uses one photographic action renderer without helper graphics", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const keeper = source.slice(
    source.indexOf("  drawKeeperNaturalReplay(ctx"),
    source.indexOf("\n  drawKeeperPovWorld(ctx")
  );
  assert.match(keeper, /this\.assets\.keeper/);
  assert.match(keeper, /keeperMotionPlan/);
  assert.match(keeper, /drawBallMarker/);
  assert.doesNotMatch(keeper, /drawGoalImpact|drawZoneOutcome|drawKeeperLookBack|drawKeeperPovOutcome/);
  assert.doesNotMatch(keeper, /setLineDash|wireframe net patch.*draw/i);
  assert.match(keeper, /no wireframe net patch/);
});

test("0.9H2C keeper replay and final still remain on the natural action camera", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const cinematic = source.slice(
    source.indexOf("  drawKeeperCinematic(ctx"),
    source.indexOf("\n  drawKeeperPovWorld(ctx")
  );
  const still = source.slice(
    source.indexOf("  drawKeeperResultStill(ctx"),
    source.indexOf("\n  drawCinematicBallFlight(ctx")
  );
  assert.match(cinematic, /drawKeeperNaturalReplay/);
  assert.match(still, /drawKeeperNaturalReplay/);
  assert.doesNotMatch(cinematic, /drawKeeperLookBack/);
  assert.doesNotMatch(still, /drawKeeperLookBack|drawKeeperPovWorld/);
});

test("0.9H2C renders goal, save and miss without throwing", () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  for (const outcome of ["goal", "save", "miss"]) {
    const replay = { shotZone: "bottom-left", keeperZone: "top-right", outcome, progress: 0.75, kickIndex: 1 };
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1000, false, "keeper"));
    assert.doesNotThrow(() => pack.drawResultStill(ctx, replay, 1000, "keeper"));
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
