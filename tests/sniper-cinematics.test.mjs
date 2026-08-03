import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = path => readFile(new URL(path, root), "utf8");

test("0.9B scene contains a staged travelling-shot timeline", async () => {
  const source = await text("sniper-scene.mjs");
  assert.match(source, /shotAStart/);
  assert.match(source, /shotAImpact/);
  assert.match(source, /shotBStart/);
  assert.match(source, /drawMuzzleFlash/);
  assert.match(source, /drawShot/);
  assert.match(source, /Math\.hypot/);
  assert.match(source, /TAGGED/);
  assert.match(source, /MISS/);
});

test("0.9B hit reaction remains explicitly clean and non-graphic", async () => {
  const [scene, guide, replay] = await Promise.all([
    text("sniper-scene.mjs"),
    text("docs/SNIPER_ELITE_0.9B.md"),
    text("replay.js")
  ]);
  assert.match(scene, /training-hit flash/i);
  assert.match(guide, /no blood/i);
  assert.match(replay, /no blood/i);
  assert.doesNotMatch(scene, /blood|wound|gore/i);
});

test("0.9B audio synthesizes shot and impact cues without external media", async () => {
  const audio = await text("sniper-audio.mjs");
  assert.match(audio, /function gunshot/);
  assert.match(audio, /createBuffer/);
  assert.match(audio, /function impact/);
  assert.doesNotMatch(audio, /\.mp3|\.wav|fetch\(/i);
});
