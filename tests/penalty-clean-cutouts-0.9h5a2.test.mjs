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

test("0.9H5A2 pages load the clean-cutout module chain", async () => {
  const [turn, replay, demo, scene] = await Promise.all([
    read("turn.html"), read("replay.html"), read("shootout.html"), read("shootout-scene-0.9h5a2.mjs")
  ]);
  assert.match(turn, /turn-0\.9h5a2\.js/);
  assert.match(replay, /replay-0\.9h5a2\.js/);
  assert.match(demo, /shootout-0\.9h5a2\.js/);
  assert.match(scene, /penalty-visuals-0\.9h5a2\.mjs/);
});

test("0.9H5A2 references only the new transparent player cutouts", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a2.mjs", import.meta.url));
  const assets = visuals.PENALTY_VISUAL_ASSETS.singleAngle;
  const playerAssets = [assets.strikerContact, assets.strikerFollow, assets.keeperReady, assets.keeperHighLeft, assets.keeperHighRight];
  for (const relative of playerAssets) {
    assert.match(relative, /0\.9h5a2\.png$/);
    const info = await stat(new URL(`../${relative.replace(/^\.\//, "")}`, import.meta.url));
    assert.ok(info.size > 1000);
  }
  assert.doesNotMatch(playerAssets.join("\n"), /0\.9h5a1\.png/);
});

test("0.9H5A2 preserves marked spots, one ball owner and scale limits", async () => {
  const visuals = await import(new URL("../penalty-visuals-0.9h5a2.mjs", import.meta.url));
  assert.deepEqual(visuals.BROADCAST_SELECTION_POINTS.zones, exactSpots);
  assert.equal(visuals.PENALTY_BALL_RENDER_OWNER, "dedicated-ball-layer");
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.striker.maxWidth, 58);
  assert.equal(visuals.BROADCAST_PLAYER_SCALE_LIMITS.keeperDive.maxWidth, 112);
});
