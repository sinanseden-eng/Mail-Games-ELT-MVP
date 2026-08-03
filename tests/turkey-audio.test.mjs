import test from "node:test";
import assert from "node:assert/strict";
import { createTurkeyAudio, turkeyCueProfile } from "../turkey-audio.mjs";

test("0.8 Turkey Fight has distinct hit, block and finish sound plans", () => {
  const hit = turkeyCueProfile({ type: "impact", damage: 18 });
  const block = turkeyCueProfile({ type: "impact", damage: 0 });
  const finish = turkeyCueProfile({ type: "fight-result", completed: true });
  assert.notDeepEqual(hit, block);
  assert.ok(finish.some(cue => cue.kind === "chord"));
});

test("0.8 Turkey Fight audio remains safe without Web Audio", async () => {
  const audio = createTurkeyAudio({ enabled: true });
  assert.equal(await audio.unlock(), false);
  assert.doesNotThrow(() => audio.handleEvent({ type: "gobble" }));
});
