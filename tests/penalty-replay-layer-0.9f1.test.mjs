import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { penaltyVisualFramePlan } from "../penalty-visuals.mjs";

test("0.9F1 cinematic player frames fully cover the old canvas actors", () => {
  const establishing = penaltyVisualFramePlan(0.03, "goal");
  const runup = penaltyVisualFramePlan(0.15, "goal");
  assert.equal(establishing.fullOpacity, 1);
  assert.equal(runup.fullOpacity, 1);
});

test("0.9F1 replay pages never expose the interactive goal-zone grid", async () => {
  const replay = await readFile(new URL("../replay.js", import.meta.url), "utf8");
  const turn = await readFile(new URL("../turn.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../turn.css", import.meta.url), "utf8");

  assert.match(replay, /elements\.overlay\.hidden = true/);
  assert.match(replay, /penalty-replay-running/);
  assert.match(turn, /async function showPenaltyReplay[\s\S]*elements\.overlay\.hidden = true/);
  assert.match(turn, /function renderPenaltyTurn[\s\S]*elements\.overlay\.hidden = false/);
  assert.match(css, /\.replay-page \.goal-zone-overlay/);
  assert.match(css, /pointer-events: none !important/);
});

test("0.9G supersedes the mixed interactive renderer with a photographic selection scene", async () => {
  const scene = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  assert.match(scene, /visualPack\.drawSelection/);
  assert.match(scene, /one photographic renderer from selection/);
  assert.doesNotMatch(scene, /visualPack\.drawEnvironment\(ctx, time\)/);
  assert.doesNotMatch(scene, /visualPack\.drawPitchTexture/);
});
