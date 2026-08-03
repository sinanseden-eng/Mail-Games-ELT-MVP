import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("0.9G keeps the legacy cartoon renderer out of normal selection and replay", async () => {
  const scene = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  const drawBlock = scene.slice(scene.indexOf("  draw(time) {"), scene.indexOf("\n  idleBall()"));
  assert.match(drawBlock, /drawSelection/);
  assert.match(drawBlock, /drawCinematic/);
  assert.match(drawBlock, /drawResultStill/);
  assert.doesNotMatch(drawBlock, /drawBackground/);
  assert.doesNotMatch(drawBlock, /drawStriker/);
  assert.doesNotMatch(drawBlock, /drawKeeper/);
});

test("0.9G uses full-screen realistic frames through ball flight and final result", async () => {
  const visuals = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  assert.match(visuals, /label: "BALL FLIGHT"/);
  assert.match(visuals, /drawCinematicBallFlight/);
  assert.match(visuals, /drawResultStill/);
  assert.match(visuals, /this\.drawFullFrame\(ctx, image, 1/);
});
