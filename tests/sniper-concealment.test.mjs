import test from "node:test";
import assert from "node:assert/strict";
import { publicMatchForTurn } from "../netlify/functions/_shared/matches.mjs";

test("0.9A Player B cannot inspect Player A's Sniper Elite choices", () => {
  const match = {
    id: "match-sniper",
    game_type: "sniper",
    status: "active",
    player_a_name: "Aylin",
    player_b_name: "Bora",
    state: {
      round: 1,
      phase: "B",
      healthA: 3,
      healthB: 3,
      emergenceA: "rooftop",
      targetA: "broken-wall",
      activeA: true,
      turnAId: "turn-a"
    }
  };
  const payload = publicMatchForTurn(match, { actor: "B", role: "sniper" });
  assert.equal(payload.state.emergenceA, null);
  assert.equal(payload.state.targetA, null);
  assert.equal(payload.state.activeA, null);
  assert.equal(payload.state.turnAId, null);
  assert.equal(payload.state.healthA, 3);
});
