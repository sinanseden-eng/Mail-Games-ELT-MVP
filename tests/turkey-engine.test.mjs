import test from "node:test";
import assert from "node:assert/strict";
import { applyTurn, defaultState, turkeyAttack } from "../netlify/functions/_shared/game-engine.mjs";

test("0.8 Turkey Fight resolves two secret moves into a structured replay", () => {
  const first = applyTurn("turkey", defaultState("turkey"), {
    actor: "A",
    move: "wing-slap",
    answerCorrect: true
  });
  assert.equal(first.resolved, false);
  assert.equal(first.state.phase, "B");

  const second = applyTurn("turkey", first.state, {
    actor: "B",
    move: "duck",
    answerCorrect: true
  });
  assert.equal(second.resolved, true);
  assert.equal(second.replay.gameType, "turkey");
  assert.equal(second.replay.round, 1);
  assert.equal(second.replay.moveA, "wing-slap");
  assert.equal(second.replay.moveB, "duck");
  assert.equal(second.replay.damageToB, 0);
  assert.equal(second.replay.healthB, 100);
  assert.deepEqual(second.state.history[0], second.replay);
  assert.equal(second.state.phase, "A");
  assert.equal(second.state.round, 2);
});

test("0.8 incorrect answers make Turkey Fight moves futile", () => {
  const first = applyTurn("turkey", defaultState("turkey"), {
    actor: "A",
    move: "charge",
    answerCorrect: false
  });
  const second = applyTurn("turkey", first.state, {
    actor: "B",
    move: "peck",
    answerCorrect: true
  });
  assert.equal(second.replay.damageToB, 0);
  assert.equal(second.replay.damageToA, 14);
  assert.equal(second.replay.activeA, false);
  assert.equal(second.replay.healthA, 86);
});

test("0.8 Turkey Fight records a winner when health reaches zero", () => {
  const state = { ...defaultState("turkey"), phase: "B", healthA: 10, moveA: "block", activeA: false };
  const result = applyTurn("turkey", state, { actor: "B", move: "peck", answerCorrect: true });
  assert.equal(result.completed, true);
  assert.equal(result.replay.winner, "B");
  assert.equal(result.replay.healthA, 0);
});

test("0.8 defence table keeps reduced and blocked damage deterministic", () => {
  assert.deepEqual(turkeyAttack("charge", true, "block", true), { damage: 10, effect: "partial" });
  assert.deepEqual(turkeyAttack("charge", true, "duck", true), { damage: 0, effect: "blocked" });
  assert.deepEqual(turkeyAttack("peck", true, "counter", true), { damage: 0, effect: "blocked" });
});
