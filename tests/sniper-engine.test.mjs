import test from "node:test";
import assert from "node:assert/strict";
import { applyTurn, currentTurn, defaultState, SNIPER_SPOTS } from "../netlify/functions/_shared/game-engine.mjs";

function submit(state, actor, emergence, target, answerCorrect = true) {
  return applyTurn("sniper", state, { actor, emergence, target, answerCorrect });
}

test("0.9A Sniper Elite starts with three health and four legal positions", () => {
  const state = defaultState("sniper");
  assert.equal(state.healthA, 3);
  assert.equal(state.healthB, 3);
  assert.equal(state.maxRounds, 5);
  assert.deepEqual(SNIPER_SPOTS, ["rooftop", "upper-window", "broken-wall", "supply-crates"]);
  assert.deepEqual(currentTurn("sniper", state), { actor: "A", role: "sniper" });
});

test("0.9A a correct prediction scores one non-graphic training tag", () => {
  let state = defaultState("sniper");
  const first = submit(state, "A", "rooftop", "broken-wall", true);
  assert.equal(first.resolved, false);
  state = first.state;
  const second = submit(state, "B", "broken-wall", "supply-crates", true);
  assert.equal(second.resolved, true);
  assert.equal(second.replay.hitByA, true);
  assert.equal(second.replay.hitByB, false);
  assert.equal(second.replay.healthA, 3);
  assert.equal(second.replay.healthB, 2);
});

test("0.9A an incorrect answer keeps the emergence choice but disables the shot", () => {
  let state = defaultState("sniper");
  const first = submit(state, "A", "upper-window", "broken-wall", false);
  assert.equal(first.state.emergenceA, "upper-window");
  assert.equal(first.state.targetA, "broken-wall");
  assert.equal(first.state.activeA, false);
  state = first.state;
  const second = submit(state, "B", "broken-wall", "upper-window", true);
  assert.equal(second.replay.hitByA, false);
  assert.equal(second.replay.hitByB, true);
  assert.equal(second.replay.healthA, 2);
  assert.equal(second.replay.healthB, 3);
});

test("0.9A both players can score a tag in the same round", () => {
  let state = defaultState("sniper");
  state = submit(state, "A", "rooftop", "supply-crates", true).state;
  const result = submit(state, "B", "supply-crates", "rooftop", true);
  assert.equal(result.replay.hitByA, true);
  assert.equal(result.replay.hitByB, true);
  assert.equal(result.replay.healthA, 2);
  assert.equal(result.replay.healthB, 2);
});

test("0.9A the fifth round ends the match and chooses the higher-health winner", () => {
  const state = {
    ...defaultState("sniper"),
    round: 5,
    phase: "A",
    healthA: 3,
    healthB: 2
  };
  const first = submit(state, "A", "rooftop", "upper-window", true);
  const result = submit(first.state, "B", "broken-wall", "supply-crates", true);
  assert.equal(result.completed, true);
  assert.equal(result.replay.completed, true);
  assert.equal(result.replay.winner, "A");
});
