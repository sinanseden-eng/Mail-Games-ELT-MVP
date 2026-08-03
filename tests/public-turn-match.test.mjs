import test from "node:test";
import assert from "node:assert/strict";
import { publicMatchForTurn } from "../netlify/functions/_shared/matches.mjs";

const match = {
  id: "match-1",
  game_type: "penalty",
  status: "active",
  player_a_name: "Alex",
  player_b_name: "Bora",
  state: {
    kickIndex: 0,
    scoreA: 0,
    scoreB: 0,
    phase: "keeper",
    shot: "top-right",
    shotActive: true,
    shotTurnId: "secret-turn"
  },
  expires_at: "2099-01-01T00:00:00.000Z"
};

test("keeper turn payload conceals the striker's secret zone", () => {
  const publicValue = publicMatchForTurn(match, { role: "keeper" });
  assert.equal(publicValue.state.shot, null);
  assert.equal(publicValue.state.shotActive, null);
  assert.equal(publicValue.state.shotTurnId, null);
  assert.equal(match.state.shot, "top-right");
});

test("striker turn payload keeps ordinary public match state", () => {
  const publicValue = publicMatchForTurn(match, { role: "striker" });
  assert.equal(publicValue.state.shot, "top-right");
});

const turkeyMatch = {
  id: "match-turkey",
  game_type: "turkey",
  status: "active",
  player_a_name: "Alex",
  player_b_name: "Bora",
  state: {
    round: 1,
    phase: "B",
    healthA: 100,
    healthB: 100,
    moveA: "charge",
    activeA: true,
    moveATurnId: "secret-turkey-turn"
  },
  expires_at: "2099-01-01T00:00:00.000Z"
};

test("0.8 Fighter B payload conceals Fighter A's secret move", () => {
  const publicValue = publicMatchForTurn(turkeyMatch, { actor: "B", role: "fighter" });
  assert.equal(publicValue.state.moveA, null);
  assert.equal(publicValue.state.activeA, null);
  assert.equal(publicValue.state.moveATurnId, null);
  assert.equal(turkeyMatch.state.moveA, "charge");
});
