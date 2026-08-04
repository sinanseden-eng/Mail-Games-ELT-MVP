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

test("0.9H5A pages load the scale-and-net module chain", async () => {
  const [turn, replay, demo, scene] = await Promise.all([read("turn.html"), read("replay.html"), read("shootout.html"), read("shootout-scene-0.9h5a.mjs")]);
  assert.match(turn, /turn-0\.9h5a(?:1|2)?\.js/);
  assert.match(replay, /replay-0\.9h5a(?:1|2)?\.js/);
  assert.match(demo, /shootout-0\.9h5a(?:1|2)?\.js/);
  assert.match(scene, /penalty-visuals-0\.9h5a\.mjs/);
});

test("0.9H5A preserves every marked coordinate", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a.mjs", import.meta.url));
  assert.deepEqual(visuals.BROADCAST_SELECTION_POINTS.zones, exactSpots);
});

test("0.9H5A keeps player composites within broadcast-scale bounds", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a.mjs", import.meta.url));
  const replay = { outcome: "goal", shotZone: "bottom-right", keeperZone: "top-left" };
  const striker = visuals.singleAngleStrikerState(replay, 0.24);
  const keeper = visuals.singleAngleKeeperState(replay, 0.63);
  assert.ok(striker.contact.height <= 132);
  assert.ok(striker.follow.height <= 154);
  assert.ok(keeper.move.width <= 190);
  assert.ok(keeper.move.height <= 124);
});

test("0.9H5A ball stays readable at all six goal targets", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a.mjs", import.meta.url));
  const physics = await import(new URL("../shootout-physics-0.9h5a.mjs", import.meta.url));
  for (const zone of Object.keys(exactSpots)) {
    const state = visuals.singleAngleBallState({ outcome: "goal", shotZone: zone, keeperZone: "bottom-centre" }, physics.REPLAY_TIMELINE.goalPlane);
    assert.equal(state.target.x, exactSpots[zone].x);
    assert.equal(state.target.y, exactSpots[zone].y);
    assert.ok(state.radius >= 7.9);
  }
});

test("0.9H5A defines a distinct net sag profile for every goal zone", async () => {
  const net = await import(new URL("../shootout-net.mjs", import.meta.url));
  const profiles = Object.entries(net.NET_SAG_PROFILES);
  assert.equal(profiles.length, 6);
  const signatures = new Set(profiles.map(([, p]) => [p.biasX, p.biasY, p.spanX, p.spanY, p.pocketDepth, p.drop].join(":")));
  assert.equal(signatures.size, 6);
  assert.ok(net.NET_SAG_PROFILES["bottom-centre"].pocketDepth > net.NET_SAG_PROFILES["top-centre"].pocketDepth);
  assert.ok(net.netSagEnvelope(0.12) > net.netSagEnvelope(0.9));
});

test("0.9H5A renders sag only after a goal impact", async () => {
  const visuals = await read("penalty-visuals-0.9h5a.mjs");
  const cinematic = visuals.slice(visuals.indexOf("  drawSingleAngleCinematic(ctx, replay"), visuals.indexOf("\n  drawSingleAngleKeeper(ctx, state"));
  assert.match(cinematic, /replay\.outcome === "goal"/);
  assert.match(cinematic, /drawIntegratedNetRipple/);
  assert.match(visuals, /netSagProfile\(zoneId\)/);
  assert.match(visuals, /const cols = 8/);
  assert.match(visuals, /const rows = 7/);
});


test("0.9H5A all six goal-sag scenes remain render-safe", async () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const { PenaltyVisualPack } = await import(new URL("../penalty-visuals-0.9h5a.mjs", import.meta.url));
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  for (const zone of Object.keys(exactSpots)) {
    const replay = { outcome: "goal", shotZone: zone, keeperZone: "bottom-centre", progress: 0.74, kickIndex: 2 };
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1900, false, "striker"));
    replay.progress = 0.96;
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 3400, false, "striker"));
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
