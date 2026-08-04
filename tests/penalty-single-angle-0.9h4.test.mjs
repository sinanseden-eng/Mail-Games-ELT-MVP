import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  PenaltyVisualPack,
  REALISTIC_SELECTION_POINTS,
  BROADCAST_SELECTION_POINTS,
  SINGLE_ANGLE_KEEPER_MOVES,
  SINGLE_ANGLE_SHOT_MOVES,
  singleAngleBallState,
  singleAngleKeeperMove,
  singleAngleKeeperState,
  singleAngleShotMove
} from "../penalty-visuals.mjs";
import { REPLAY_TIMELINE } from "../shootout-physics.mjs";

const zones = [
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
];

test("0.9H4 defines six taker moves and six goalkeeper moves for the fixed camera", () => {
  assert.deepEqual(Object.keys(SINGLE_ANGLE_SHOT_MOVES), zones);
  assert.deepEqual(Object.keys(SINGLE_ANGLE_KEEPER_MOVES), zones);
  assert.equal(new Set(zones.map(zone => JSON.stringify(singleAngleShotMove(zone)))).size, 6);
  assert.equal(new Set(zones.map(zone => JSON.stringify(singleAngleKeeperMove(zone)))).size, 6);
});

test("0.9H4 sends every goal shot to its exact selected coordinate", () => {
  for (const zone of zones) {
    const replay = { shotZone: zone, keeperZone: "bottom-centre", outcome: "goal", kickIndex: 2 };
    const state = singleAngleBallState(replay, REPLAY_TIMELINE.goalPlane);
    assert.ok(Math.hypot(state.x - BROADCAST_SELECTION_POINTS.zones[zone].x, state.y - BROADCAST_SELECTION_POINTS.zones[zone].y) < 0.001, zone);
    assert.equal(state.zoneId, zone);
    assert.equal(replay.shotZone, zone);
  }
});

test("0.9H4 keeps the shot and goalkeeper choices independent", () => {
  const replay = { shotZone: "top-left", keeperZone: "bottom-right", outcome: "goal" };
  const ball = singleAngleBallState(replay, 0.55);
  const keeper = singleAngleKeeperState(replay, 0.55);
  assert.equal(ball.zoneId, "top-left");
  assert.equal(keeper.zoneId, "bottom-right");
  assert.equal(keeper.move.label, "LOW RIGHT");
});

test("0.9H4 uses one cinematic renderer regardless of signed viewer role", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const dispatch = source.slice(source.indexOf("  drawCinematic(ctx"), source.indexOf("\n  drawSingleAngleCinematic(ctx"));
  assert.match(dispatch, /drawSingleAngleCinematic/);
  assert.doesNotMatch(dispatch, /drawKeeperCinematic|drawStrikerCinematic|role ===/);
  assert.match(source, /PENALTY REPLAY · (?:MAIN|BROADCAST) CAMERA/);
});

test("0.9H4 packages the fixed stadium plate and realistic player sprites", async () => {
  const paths = [
    "stadium-clean.jpg", "striker-contact.png", "striker-follow.png",
    "keeper-ready.png", "keeper-high-left.png", "keeper-high-right.png",
    "keeper-low-left.png", "keeper-low-right.png"
  ];
  for (const name of paths) {
    const info = await stat(new URL(`../assets/penalty-single-angle/${name}`, import.meta.url));
    assert.ok(info.size > 20_000, `${name}: ${info.size}`);
  }
});

test("0.9H4 renders every shot/dive pairing without changing camera", () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  for (const shotZone of zones) {
    for (const keeperZone of zones) {
      const replay = { shotZone, keeperZone, outcome: shotZone === keeperZone ? "save" : "goal", progress: 0.62, kickIndex: 3 };
      assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1600, false, "striker"));
      assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1600, false, "keeper"));
    }
  }
  delete globalThis.Image;
});

test("0.9H4 active replay copy describes one fixed camera", async () => {
  const [turn, replay, scene, html] = await Promise.all([
    readFile(new URL("../turn.js", import.meta.url), "utf8"),
    readFile(new URL("../replay.js", import.meta.url), "utf8"),
    readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8"),
    readFile(new URL("../shootout.html", import.meta.url), "utf8")
  ]);
  assert.match(turn, /Fixed main camera/);
  assert.match(replay, /one fixed camera/);
  assert.match(scene, /fixed main-camera angle/);
  assert.match(html, /(?:Single-angle six-zone replay 0\.9H4|Broadcast scale and six-zone net reaction 0\.9H5A)/);
});

function fakeContext() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "drawImage", "ellipse",
    "fill", "fillRect", "fillText", "lineTo", "moveTo", "quadraticCurveTo", "restore", "rotate", "roundRect",
    "save", "scale", "setLineDash", "stroke", "strokeRect", "strokeText", "translate"
  ]);
  return new Proxy({}, {
    get(target, key) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 100 });
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}
