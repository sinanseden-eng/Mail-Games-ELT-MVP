import test from "node:test";
import assert from "node:assert/strict";
import { applyTurn, defaultState } from "../netlify/functions/_shared/game-engine.mjs";

test("a resolved email penalty produces a structured cinematic replay", () => {
  let state = defaultState("penalty");
  const shot = applyTurn("penalty", state, {
    actor: "A",
    move: "top-right",
    answerCorrect: true
  });
  assert.equal(shot.resolved, false);
  assert.equal(shot.state.phase, "keeper");

  const save = applyTurn("penalty", shot.state, {
    actor: "B",
    move: "bottom-left",
    answerCorrect: true
  });
  assert.equal(save.resolved, true);
  assert.equal(save.replay.outcome, "goal");
  assert.equal(save.replay.shotZone, "top-right");
  assert.equal(save.replay.keeperZone, "bottom-left");
  assert.equal(save.replay.striker, "A");
  assert.equal(save.replay.keeper, "B");
  assert.equal(save.replay.scoreA, 1);
  assert.deepEqual(save.state.history[0], save.replay);
});

test("an inactive shot is stored as a miss for deterministic replay", () => {
  const shot = applyTurn("penalty", defaultState("penalty"), {
    actor: "A",
    move: "top-left",
    answerCorrect: false
  });
  const result = applyTurn("penalty", shot.state, {
    actor: "B",
    move: "top-left",
    answerCorrect: true
  });
  assert.equal(result.replay.outcome, "miss");
  assert.equal(result.replay.goal, false);
  assert.equal(result.replay.reason, "inactive-shot");
});
