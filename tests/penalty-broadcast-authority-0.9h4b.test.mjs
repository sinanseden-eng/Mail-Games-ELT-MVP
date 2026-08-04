import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("0.9H4B pages load uniquely named broadcast entry scripts", async () => {
  const [turn, replay, shootout] = await Promise.all([
    read("turn.html"), read("replay.html"), read("shootout.html")
  ]);
  assert.match(turn, /(?:turn-0\.9h4b\.js|turn-0\.9h4c\.js|turn-0\.9h4d\.js|turn-0\.9h5\.js)/);
  assert.match(replay, /(?:replay-0\.9h4b\.js|replay-0\.9h4c\.js|replay-0\.9h4d\.js|replay-0\.9h5\.js)/);
  assert.match(shootout, /(?:shootout-0\.9h4b\.js|shootout-0\.9h4c\.js|shootout-0\.9h4d\.js|shootout-0\.9h5\.js)/);
  assert.doesNotMatch(turn, /turn\.js\?v=0\.9\.23/);
});

test("0.9H4B browser chain cannot resolve to the old scene or visual module", async () => {
  const [turn, replay, demo, scene] = await Promise.all([
    read("turn-0.9h4b.js"), read("replay-0.9h4b.js"),
    read("shootout-0.9h4b.js"), read("shootout-scene-0.9h4b.mjs")
  ]);
  for (const entry of [turn, replay, demo]) {
    assert.match(entry, /shootout-scene-0\.9h4b\.mjs/);
    assert.doesNotMatch(entry, /shootout-scene\.mjs\?v=0\.9\.23/);
  }
  assert.match(scene, /penalty-visuals-0\.9h4b\.mjs/);
  assert.doesNotMatch(scene, /penalty-visuals\.mjs\?v=0\.9\.23/);
});

test("0.9H4B active visual pack initializes from the exact broadcast plate", async () => {
  const visuals = await read("penalty-visuals-0.9h4b.mjs");
  assert.match(visuals, /broadcast-reference-0\.9h4b\.png/);
  assert.match(visuals, /PENALTY · BROADCAST CAMERA/);
  assert.match(visuals, /PENALTY REPLAY · BROADCAST CAMERA/);
  const selection = visuals.slice(visuals.indexOf("drawSelection("), visuals.indexOf("drawLoadingFrame("));
  assert.match(selection, /this\.assets\.singleAngle\?\.background/);
  assert.doesNotMatch(selection, /this\.assets\.striker\[0\]/);
  const info = await stat(new URL("../assets/penalty-single-angle/broadcast-reference-0.9h4b.png", import.meta.url));
  assert.ok(info.size > 500_000);
});
