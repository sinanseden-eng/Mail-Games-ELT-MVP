import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PENALTY_MOTION_TIMING,
  PenaltyVisualPack,
  keeperDiveMotionState,
  keeperNaturalActionState,
  naturalBallFlightEasing,
  naturalFrameSequence
} from "../penalty-visuals.mjs";
import { REPLAY_TIMELINE } from "../shootout-physics.mjs";

test("0.9H3 gives the ball a decisive launch without changing its exact endpoint", () => {
  const quarter = naturalBallFlightEasing(0.25);
  const half = naturalBallFlightEasing(0.5);
  const finish = naturalBallFlightEasing(1);
  assert.ok(quarter > 0.35, `quarter-flight=${quarter}`);
  assert.ok(half > quarter && half < 1);
  assert.equal(finish, 1);

  const replay = { shotZone: "top-right", keeperZone: "bottom-left", outcome: "goal", kickIndex: 4 };
  const contact = keeperNaturalActionState(replay, REPLAY_TIMELINE.goalPlane);
  assert.ok(Math.hypot(contact.x - contact.target.x, contact.y - contact.target.y) < 0.001);
});

test("0.9H3 stages keeper anticipation, launch, extension and landing in order", () => {
  const replay = { shotZone: "bottom-left", keeperZone: "top-right", outcome: "goal" };
  const anticipate = keeperDiveMotionState(replay, REPLAY_TIMELINE.strike - 0.03);
  const launch = keeperDiveMotionState(replay, REPLAY_TIMELINE.strike + 0.07);
  const extension = keeperDiveMotionState(replay, REPLAY_TIMELINE.goalPlane);
  const landing = keeperDiveMotionState(replay, 0.93);

  assert.ok(anticipate.anticipation > 0);
  assert.equal(anticipate.launch, 0);
  assert.ok(launch.launch > 0);
  assert.ok(extension.extension > launch.extension);
  assert.ok(landing.landing > 0);
  assert.equal(PENALTY_MOTION_TIMING.keeperFullExtension, REPLAY_TIMELINE.keeperContact);
});

test("0.9H3 uses short motion-matched transitions instead of long double exposures", () => {
  const hold = naturalFrameSequence(0.125, 5, 0.18);
  const transition = naturalFrameSequence(0.245, 5, 0.18);
  assert.equal(hold.mix, 0);
  assert.ok(transition.mix > 0);
  assert.ok(transition.mix <= 1);
});

test("0.9H3 exposes ball velocity and contact compression for physical rendering", () => {
  const replay = { shotZone: "bottom-right", keeperZone: "bottom-right", outcome: "save", kickIndex: 1 };
  const flight = keeperNaturalActionState(replay, 0.43);
  const contact = keeperNaturalActionState(replay, REPLAY_TIMELINE.keeperContact);
  assert.ok(flight.velocity > 100);
  assert.ok(Number.isFinite(flight.velocityAngle));
  assert.ok(contact.contactCompression > 0.95);
});

test("0.9H3 renders motion-matched player frames, attached blur and integrated net ripple", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const striker = source.slice(source.indexOf("  drawStrikerCinematic(ctx"), source.indexOf("\n  drawKeeperCinematic(ctx"));
  const keeper = source.slice(source.indexOf("  drawKeeperNaturalReplay(ctx"), source.indexOf("\n  drawKeeperPovWorld(ctx"));
  assert.match(striker, /drawMotionMatchedFullFrame/);
  assert.match(keeper, /drawMotionMatchedFullFrame/);
  assert.match(keeper, /drawBallMotionBlur/);
  assert.match(keeper, /drawIntegratedNetRipple/);
  assert.doesNotMatch(keeper, /draw(?:Pointer|Target)|setLineDash|drawGoalImpact|drawZoneOutcome/);
});

test("0.9H3 keeper goal, save and miss frames remain render-safe", () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  for (const outcome of ["goal", "save", "miss"]) {
    const replay = { shotZone: "top-left", keeperZone: "bottom-right", outcome, progress: 0.60, kickIndex: 2 };
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1400, false, "keeper"));
    replay.progress = 0.93;
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 2600, false, "keeper"));
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
