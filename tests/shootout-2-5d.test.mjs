import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("0.7.2 scene contains layered 2.5D rendering primitives", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  for (const method of [
    "drawStadium(ctx, time)",
    "drawGoalVolume(ctx)",
    "drawCharacterShadow(ctx",
    "drawLimb(ctx",
    "drawGlove(ctx",
    "drawBoot(ctx",
    "drawHead(ctx"
  ]) {
    assert.match(source, new RegExp(method.replace(/[()]/g, "\\$&")));
  }
  assert.match(source, /direction-aware|2\.5D dive|Rear limbs establish depth/);
});

test("0.7.2 visual upgrade remains asset-independent", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /new Image\(|fetch\(|\.png[\"']|\.webp[\"']/);
});
