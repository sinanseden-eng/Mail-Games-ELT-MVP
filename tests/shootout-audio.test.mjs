import test from "node:test";
import assert from "node:assert/strict";
import { cueProfile, ShootoutAudio } from "../shootout-audio.mjs";

test("0.7.3 goal, save and miss results have distinct synthesized cue plans", () => {
  const goal = cueProfile({ type: "result", outcome: "goal" });
  const save = cueProfile({ type: "result", outcome: "save" });
  const miss = cueProfile({ type: "result", outcome: "miss" });
  assert.ok(goal.some(cue => cue.kind === "chord"));
  assert.ok(save.some(cue => cue.kind === "chord"));
  assert.ok(miss.some(cue => cue.kind === "tone"));
  assert.notDeepEqual(goal, save);
  assert.notDeepEqual(save, miss);
});

test("0.7.3 strike cue combines boot impact and low-frequency weight", () => {
  const strike = cueProfile({ type: "strike" });
  assert.ok(strike.some(cue => cue.kind === "noise"));
  assert.ok(strike.some(cue => cue.kind === "tone" && cue.frequency < 150));
});

test("0.7.3 audio controller is a safe no-op without Web Audio", async () => {
  const previousAudioContext = globalThis.AudioContext;
  delete globalThis.AudioContext;
  const audio = new ShootoutAudio({ enabled: true });
  assert.equal(await audio.unlock(), false);
  assert.doesNotThrow(() => audio.handleEvent({ type: "strike" }));
  if (previousAudioContext) globalThis.AudioContext = previousAudioContext;
});
