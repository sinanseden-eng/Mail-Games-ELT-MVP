import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SNIPER_REPLAY_TIMELINE } from "../sniper-scene.mjs";

const root = new URL("../", import.meta.url);
const text = path => readFile(new URL(path, root), "utf8");

test("0.9D adds deliberate target acquisition before both stored shots", async () => {
  const source = await text("sniper-scene.mjs");
  assert.match(source, /lockAStart/);
  assert.match(source, /lockBStart/);
  assert.match(source, /scope-lock/);
  assert.match(source, /TRACKING PREDICTED COVER/);
  assert.match(source, /TARGET ACQUIRED · BREATH HELD/);
  assert.match(source, /lockRadius/);
  assert.match(source, /% LOCK/);
});

test("0.9D gives recoil, projectile travel and clean hit reactions separate readable phases", async () => {
  const source = await text("sniper-scene.mjs");
  assert.match(source, /recoilEnvelope/);
  assert.match(source, /wakeRadius/);
  assert.match(source, /ROUND IN FLIGHT/);
  assert.match(source, /liveStagger/);
  assert.match(source, /reaction\.collapse/);
  assert.match(source, /fillText\("HIT"/);
  assert.doesNotMatch(source, /blood|wound|gore/i);
});

test("0.9D synchronizes scope lock, layered report, impact and bolt-cycle audio", async () => {
  const audio = await text("sniper-audio.mjs");
  assert.match(audio, /function scopeLock/);
  assert.match(audio, /supersonic crack/);
  assert.match(audio, /valley echo/);
  assert.match(audio, /function boltCycle/);
  assert.match(audio, /event\.type === "bolt"/);
  assert.doesNotMatch(audio, /\.mp3|\.wav|fetch\(/i);
});


test("0.9D preserves a visible reaction-camera beat between the two scope views", () => {
  assert.ok(SNIPER_REPLAY_TIMELINE.scopeBStart > SNIPER_REPLAY_TIMELINE.reactionAEnd);
  assert.ok(SNIPER_REPLAY_TIMELINE.resultStart > SNIPER_REPLAY_TIMELINE.reactionBEnd);
});
