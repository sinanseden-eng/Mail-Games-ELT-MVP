import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PENALTY_CAMERA_PHASES,
  kickContactEnvelope,
  impactEnvelope,
  mapCameraPoint,
  penaltyCameraFrame
} from "../shootout-cinematics.mjs";
import { REPLAY_TIMELINE } from "../shootout-physics.mjs";

test("0.9E camera moves from broadcast to run-up, player POV, ball cam and impact cam", () => {
  const input = {
    outcome: "goal",
    ball: { x: 388, y: 700 },
    target: { x: 868, y: 279 }
  };
  assert.equal(penaltyCameraFrame({ ...input, progress: 0.02 }).phase, "establishing");
  assert.equal(penaltyCameraFrame({ ...input, progress: 0.13 }).phase, "run-up");
  assert.equal(penaltyCameraFrame({ ...input, progress: REPLAY_TIMELINE.strike }).phase, "over-shoulder");
  assert.equal(penaltyCameraFrame({ ...input, progress: 0.45 }).phase, "ball-cam");
  assert.equal(penaltyCameraFrame({ ...input, progress: REPLAY_TIMELINE.goalPlane }).phase, "net-cam");
  assert.equal(penaltyCameraFrame({ ...input, progress: 0.92 }).phase, "reaction");
});

test("0.9E over-shoulder framing keeps both the ball and target in the visible frame", () => {
  const ball = { x: 388, y: 700 };
  const target = { x: 868, y: 279 };
  const frame = penaltyCameraFrame({ progress: REPLAY_TIMELINE.strike, outcome: "goal", ball, target });
  const screenBall = mapCameraPoint(ball, frame);
  const screenTarget = mapCameraPoint(target, frame);
  for (const point of [screenBall, screenTarget]) {
    assert.ok(point.x > 20 && point.x < 1260, `x=${point.x}`);
    assert.ok(point.y > 20 && point.y < 710, `y=${point.y}`);
  }
  assert.ok(frame.shoulderOpacity > 0.7);
});

test("0.9E contact envelopes peak at boot, glove and net contact times", () => {
  assert.ok(kickContactEnvelope(REPLAY_TIMELINE.strike) > 0.99);
  assert.ok(kickContactEnvelope(REPLAY_TIMELINE.strike + 0.1) < 0.01);
  assert.ok(impactEnvelope(REPLAY_TIMELINE.keeperContact, "save") > 0.99);
  assert.ok(impactEnvelope(REPLAY_TIMELINE.goalPlane, "goal") > 0.99);
  assert.ok(PENALTY_CAMERA_PHASES.runupEnd < REPLAY_TIMELINE.strike);
  assert.ok(PENALTY_CAMERA_PHASES.shoulderEnd > REPLAY_TIMELINE.strike);
});

test("0.9E scene contains explicit player POV, ball tracking and outcome contact detail", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  for (const marker of [
    "drawOverShoulderView(ctx, replay, cameraFrame, ball, impactPoint, time)",
    "drawContactDetail(ctx, replay, ball, keeper, impactPoint)",
    "drawCameraPresentation(ctx, replay, cameraFrame, ball, impactPoint, time)",
    "BEHIND THE BALL",
    "BALL CAM",
    "GLOVE CAM",
    "GOAL CAM",
    "MISS CAM"
  ]) {
    assert.match(source, new RegExp(marker.replace(/[()]/g, "\\$&")));
  }
});

test("0.9E adds camera transition sound plans without external media", async () => {
  const { cueProfile } = await import("../shootout-audio.mjs");
  const shoulder = cueProfile({ type: "camera-cut", camera: "over-shoulder" });
  const ball = cueProfile({ type: "camera-cut", camera: "ball-cam" });
  assert.ok(shoulder.length > 0);
  assert.ok(ball.length > 0);
  assert.ok(shoulder.every(cue => ["noise", "tone", "chord"].includes(cue.kind)));
});
