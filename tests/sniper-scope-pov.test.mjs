import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = path => readFile(new URL(path, root), "utf8");

test("0.9C stages a separate first-person scope view for both players", async () => {
  const source = await text("sniper-scene.mjs");
  assert.match(source, /scopeAStart/);
  assert.match(source, /scopeBStart/);
  assert.match(source, /replayCamera/);
  assert.match(source, /drawScopeOverlay/);
  assert.match(source, /SCOPE POV/);
  assert.match(source, /reactionCameraState/);
});

test("0.9C exposes pause, resume and skip controls on both replay surfaces", async () => {
  const [scene, turn, replay] = await Promise.all([
    text("sniper-scene.mjs"),
    text("turn.js"),
    text("replay.js")
  ]);
  assert.match(scene, /togglePause\(\)/);
  assert.match(scene, /skipReplay\(\)/);
  assert.match(turn, /sniper-pause/);
  assert.match(turn, /sniper-skip/);
  assert.match(replay, /sniper-pause/);
  assert.match(replay, /sniper-skip/);
});

test("0.9C adds a synthesized scope-focus cue without external media", async () => {
  const audio = await text("sniper-audio.mjs");
  assert.match(audio, /function scopeFocus/);
  assert.match(audio, /event\.type === "scope"/);
  assert.doesNotMatch(audio, /\.mp3|\.wav|fetch\(/i);
});
