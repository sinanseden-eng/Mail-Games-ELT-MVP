import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");
const exactSpots = {
  "top-left": { x: 184, y: 341 },
  "top-centre": { x: 300, y: 311 },
  "top-right": { x: 419, y: 287 },
  "bottom-left": { x: 189, y: 487 },
  "bottom-centre": { x: 318, y: 457 },
  "bottom-right": { x: 423, y: 420 }
};

test("0.9H5A1 pages load the ball-free broadcast player chain", async () => {
  const [turn, replay, demo, scene] = await Promise.all([
    read("turn.html"), read("replay.html"), read("shootout.html"), read("shootout-scene-0.9h5a1.mjs")
  ]);
  assert.match(turn, /turn-0\.9h5a(?:1|2)\.js/);
  assert.match(replay, /replay-0\.9h5a(?:1|2)\.js/);
  assert.match(demo, /shootout-0\.9h5a(?:1|2)\.js/);
  assert.match(scene, /penalty-visuals-0\.9h5a(?:1|2)\.mjs/);
});

test("0.9H5A1 keeps the exact user-marked coordinates", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a1.mjs", import.meta.url));
  assert.deepEqual(visuals.BROADCAST_SELECTION_POINTS.zones, exactSpots);
});

test("0.9H5A1 uses transparent ball-free player assets only", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a1.mjs", import.meta.url));
  const assets = visuals.PENALTY_VISUAL_ASSETS.singleAngle;
  assert.equal(visuals.PENALTY_BALL_RENDER_OWNER, "dedicated-ball-layer");
  assert.match(assets.strikerContact, /striker-contact-0\.9h5a1\.png$/);
  assert.match(assets.strikerFollow, /striker-follow-0\.9h5a1\.png$/);
  assert.match(assets.keeperReady, /keeper-ready-0\.9h5a1\.png$/);
  assert.match(assets.keeperHighLeft, /keeper-dive-(left|right)-0\.9h5a1\.png$/);
  assert.match(assets.keeperLowLeft, /keeper-dive-(left|right)-0\.9h5a1\.png$/);
  const joined = Object.values(assets).join("\n");
  assert.doesNotMatch(joined, /keeper-low-(left|right)\.png/);
  for (const relative of [assets.strikerContact, assets.strikerFollow, assets.keeperReady, assets.keeperHighLeft, assets.keeperHighRight]) {
    const info = await stat(new URL(`../${relative.replace(/^\.\//, "")}`, import.meta.url));
    assert.ok(info.size > 1000);
  }
});

test("0.9H5A1 enforces strict broadcast-scale player limits", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a1.mjs", import.meta.url));
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.striker.maxWidth, 58);
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.striker.maxHeight, 124);
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.keeperDive.maxWidth, 112);
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.keeperDive.maxHeight, 58);
  for (const shotZone of Object.keys(exactSpots)) {
    const striker = visuals.singleAngleStrikerState({ outcome: "goal", shotZone, keeperZone: "bottom-centre" }, 0.24);
    assert.ok(striker.contact.width <= 58);
    assert.ok(striker.contact.height <= 124);
    assert.ok(striker.follow.width <= 58);
    assert.ok(striker.follow.height <= 124);
  }
  for (const keeperZone of Object.keys(exactSpots)) {
    const keeper = visuals.singleAngleKeeperState({ outcome: "goal", shotZone: "bottom-right", keeperZone }, 0.63);
    assert.ok(keeper.move.width <= 112);
    assert.ok(keeper.move.height <= 108);
  }
});

test("0.9H5A1 active keeper poses never contain a separate ball asset", async () => {
  const source = await read("penalty-visuals-0.9h5a1.mjs");
  const assetBlock = source.slice(source.indexOf("singleAngle: Object.freeze"), source.indexOf("})\n});", source.indexOf("singleAngle: Object.freeze")));
  assert.doesNotMatch(assetBlock, /keeper-low-left\.png|keeper-low-right\.png/);
  assert.match(source, /dedicated-ball-layer/);
  const cinematic = source.slice(source.indexOf("  drawSingleAngleCinematic(ctx, replay"), source.indexOf("\n  drawSingleAngleKeeper(ctx, state"));
  assert.equal((cinematic.match(/drawBallMarker\(/g) || []).length, 1);
});

test("0.9H5A1 player renderer clamps malformed dimensions", async () => {
  const source = await read("penalty-visuals-0.9h5a1.mjs");
  const draw = source.slice(source.indexOf("  drawSingleAngleSprite(ctx, image"), source.indexOf("\n  drawStrikerCinematic", source.indexOf("  drawSingleAngleSprite(ctx, image")));
  assert.match(draw, /safeWidth = clamp\(Number\(width\) \|\| 1, 1, 112\)/);
  assert.match(draw, /safeHeight = clamp\(Number\(height\) \|\| 1, 1, 124\)/);
  assert.match(draw, /safeScaleX = clamp/);
  assert.match(draw, /safeScaleY = clamp/);
});
