import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PENALTY_VIEWERS,
  normalizePenaltyViewer,
  perspectiveAriaLabel,
  zoneForViewer
} from "../penalty-perspective.mjs";
import {
  KEEPER_POV_POINTS,
  PenaltyVisualPack,
  keeperPerspectiveBallState,
  penaltyActionImpactPoint,
  penaltyActionImpactPointForViewer
} from "../penalty-visuals.mjs";
import { penaltyCameraFrame } from "../shootout-cinematics.mjs";
import { cueProfile } from "../shootout-audio.mjs";

const zones = [
  "top-left", "top-centre", "top-right",
  "bottom-left", "bottom-centre", "bottom-right"
];

test("0.9H1 normalizes replay viewers and provides role-specific accessibility labels", () => {
  assert.equal(normalizePenaltyViewer("keeper"), PENALTY_VIEWERS.KEEPER);
  assert.equal(normalizePenaltyViewer("striker"), PENALTY_VIEWERS.STRIKER);
  assert.equal(normalizePenaltyViewer("invented-camera"), PENALTY_VIEWERS.STRIKER);
  assert.match(perspectiveAriaLabel("keeper"), /goalkeeper/i);
  assert.match(perspectiveAriaLabel("striker"), /penalty taker/i);
});

test("0.9H1 mirrors every horizontal goal zone for the goalkeeper without changing height", () => {
  const expected = {
    "top-left": "top-right",
    "top-centre": "top-centre",
    "top-right": "top-left",
    "bottom-left": "bottom-right",
    "bottom-centre": "bottom-centre",
    "bottom-right": "bottom-left"
  };
  for (const zone of zones) assert.equal(zoneForViewer(zone, "keeper"), expected[zone]);
});

test("0.9H1 preserves the canonical event while projecting a mirrored keeper endpoint", () => {
  for (const shotZone of zones) {
    const replay = { shotZone, outcome: "goal", kickIndex: 2 };
    const canonical = penaltyActionImpactPoint(replay);
    const keeper = penaltyActionImpactPointForViewer(replay, "keeper");
    const viewedZone = zoneForViewer(shotZone, "keeper");
    assert.deepEqual({ x: keeper.x, y: keeper.y }, KEEPER_POV_POINTS.zones[viewedZone]);
    assert.equal(replay.shotZone, shotZone);
    assert.notDeepEqual(keeper, canonical);
  }
});

test("0.9H1 makes the incoming goalkeeper-view football grow rapidly toward its target", () => {
  const replay = { shotZone: "top-left", outcome: "goal", kickIndex: 1 };
  const early = keeperPerspectiveBallState(replay, 0.12);
  const late = keeperPerspectiveBallState(replay, 0.90);
  assert.ok(late.radius > early.radius * 2.5);
  assert.ok(Math.hypot(late.x - late.target.x, late.y - late.target.y) < Math.hypot(early.x - early.target.x, early.y - early.target.y));
  assert.equal(Math.round(late.target.x), KEEPER_POV_POINTS.zones["top-right"].x);
});

test("0.9H1 supplies a bounded keeper camera lean instead of a disorienting spin", () => {
  const frame = penaltyCameraFrame({
    viewerRole: "keeper",
    progress: 0.52,
    outcome: "goal",
    target: { x: 1050, y: 220 },
    keeperTarget: { x: 220, y: 220 }
  });
  assert.equal(frame.viewerRole, "keeper");
  assert.ok(Math.abs(frame.rotation) <= 0.068 + Number.EPSILON);
  assert.match(frame.phase, /keeper|incoming|look-back|reaction|contact|miss/);
});

test("0.9H1 has role-aware audio balance for distant strike and close keeper impact", () => {
  const strikerStrike = cueProfile({ type: "strike", viewerRole: "striker", zone: "top-right" });
  const keeperStrike = cueProfile({ type: "strike", viewerRole: "keeper", zone: "top-right" });
  const strikerImpact = cueProfile({ type: "impact", viewerRole: "striker", outcome: "save", zone: "top-right" });
  const keeperImpact = cueProfile({ type: "impact", viewerRole: "keeper", outcome: "save", zone: "top-right" });
  assert.ok(keeperStrike[0].gain < strikerStrike[0].gain);
  assert.ok(keeperImpact[0].gain > strikerImpact[0].gain);
});

test("0.9H1 renders striker and goalkeeper perspectives without a detached target pointer", async () => {
  class FakeImage {
    constructor() { this.complete = true; this.naturalWidth = 1280; this.naturalHeight = 720; }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }
  globalThis.Image = FakeImage;
  const pack = new PenaltyVisualPack();
  const ctx = fakeContext();
  const samples = [
    { outcome: "goal", shotZone: "top-left", keeperZone: "bottom-right", progress: 0.50 },
    { outcome: "save", shotZone: "bottom-right", keeperZone: "bottom-right", progress: 0.58 },
    { outcome: "miss", shotZone: "top-centre", keeperZone: "top-left", progress: 0.70 }
  ];
  for (const replay of samples) {
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1000, false, "striker"));
    assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1000, false, "keeper"));
  }
  delete globalThis.Image;

  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const flight = source.slice(source.indexOf("  drawCinematicBallFlight"), source.indexOf("\n  drawKeeperReactionInset"));
  const save = source.slice(source.indexOf("  drawSaveImpact"), source.indexOf("\n  drawMissImpact"));
  assert.doesNotMatch(flight, /setLineDash|lineTo\(state\.x/);
  assert.doesNotMatch(save, /setLineDash/);
  assert.match(source, /detached rectangular mini-net/);
});

test("0.9H1 keeper submission and striker email preserve their own replay roles", async () => {
  const turnSource = await readFile(new URL("../turn.js", import.meta.url), "utf8");
  const replaySource = await readFile(new URL("../replay.js", import.meta.url), "utf8");
  assert.match(turnSource, /scene\.playReplay\(replay, \{ viewerRole \}\)/);
  assert.match(turnSource, /PENALTY_VIEWERS\.KEEPER/);
  assert.match(replaySource, /normalizePenaltyViewer\(data\.viewer\?\.role\)/);
  assert.match(replaySource, /scene\.playReplay\(replay, \{ viewerRole \}\)/);
});

test("0.9H1 returns signed viewer context without storing it in the replay event", async () => {
  const getReplay = await readFile(new URL("../netlify/functions/get-replay.mjs", import.meta.url), "utf8");
  const submitTurn = await readFile(new URL("../netlify/functions/submit-turn.mjs", import.meta.url), "utf8");
  assert.match(getReplay, /viewer:\s*\{/);
  assert.match(getReplay, /claims\.recipientActor === replay\.keeper/);
  assert.doesNotMatch(submitTurn, /result_snapshot\.replay\.viewerRole|viewerRole:\s*["'](?:keeper|striker)["']/);
});

test("0.9H1 packages the clean front-on goal frame used for on-goal ball impact", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  assert.match(source, /assets\/penalty-0\.9h1\/outcome-goal-clean\.jpg/);
  const asset = new URL("../assets/penalty-0.9h1/outcome-goal-clean.jpg", import.meta.url);
  const bytes = await readFile(asset);
  assert.ok(bytes.length > 20_000);
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
