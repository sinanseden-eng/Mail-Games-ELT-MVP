import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialShootoutState,
  resolvePenaltyRound,
  applyRoundResult,
  advanceAfterReplay,
  playersForKick
} from "../shootout-core.mjs";

test("correct shot beats an inactive save", () => {
  const result = resolvePenaltyRound({
    shotZone: "top-right",
    keeperZone: "top-right",
    shotActive: true,
    keeperActive: false
  });
  assert.equal(result.outcome, "goal");
  assert.equal(result.goal, true);
  assert.equal(result.reason, "inactive-save");
});

test("same active zone is a save", () => {
  const result = resolvePenaltyRound({
    shotZone: "bottom-left",
    keeperZone: "bottom-left",
    shotActive: true,
    keeperActive: true
  });
  assert.equal(result.outcome, "save");
  assert.equal(result.goal, false);
});

test("inactive shot never scores", () => {
  for (const keeperActive of [true, false]) {
    const result = resolvePenaltyRound({
      shotZone: "top-left",
      keeperZone: "bottom-right",
      shotActive: false,
      keeperActive
    });
    assert.equal(result.outcome, "miss");
    assert.equal(result.goal, false);
  }
});

test("score is awarded to the current striker and roles alternate", () => {
  let state = createInitialShootoutState();
  state.shotZone = "top-right";
  state.keeperZone = "bottom-left";
  state.shotActive = true;
  state.keeperActive = true;
  state = applyRoundResult(state, resolvePenaltyRound(state));
  assert.equal(state.scoreA, 1);
  assert.equal(playersForKick(state.kickIndex).striker, "Player A");

  state = advanceAfterReplay(state);
  assert.equal(state.kickIndex, 1);
  assert.equal(playersForKick(state.kickIndex).striker, "Player B");
});
