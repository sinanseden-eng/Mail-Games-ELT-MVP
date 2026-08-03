import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("0.7.3 scene contains cinematic timing, event hooks and outcome celebrations", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  for (const marker of ["spawnCelebration(outcome)", "drawCinematicOverlay(ctx, replay, time)", "this.emit(\"strike\"", "this.emit(\"result\""]) {
    assert.match(source, new RegExp(marker.replace(/[()]/g, "\\$&")));
  }
  assert.match(source, /GOAL!|SAVED!|MISSED!/);
});

test("0.7.3 emailed replay waits for a user play gesture so sound can unlock", async () => {
  const source = await readFile(new URL("../replay.js", import.meta.url), "utf8");
  assert.match(source, /id=\"play-penalty\"/);
  assert.match(source, /await audio\.unlock\(\)/);
  assert.match(source, /await scene\.playReplay\(replay\)/);
});

test("0.7.3 replay timeline separates anticipation, strike, contact and result reveal", async () => {
  const { REPLAY_TIMELINE } = await import("../shootout-physics.mjs");
  assert.ok(REPLAY_TIMELINE.readyCue < REPLAY_TIMELINE.anticipationStart);
  assert.ok(REPLAY_TIMELINE.anticipationStart < REPLAY_TIMELINE.keeperTakeoff);
  assert.ok(REPLAY_TIMELINE.keeperTakeoff < REPLAY_TIMELINE.strike);
  assert.ok(REPLAY_TIMELINE.strike < REPLAY_TIMELINE.keeperContact);
  assert.ok(REPLAY_TIMELINE.keeperContact < REPLAY_TIMELINE.resultReveal);
});
