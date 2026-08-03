import test from "node:test";
import assert from "node:assert/strict";
import {
  createReplayToken,
  createTurnToken,
  verifyReplayToken,
  verifyTurnToken
} from "../netlify/functions/_shared/token.mjs";

const originalSecret = process.env.TURN_TOKEN_SECRET;

test.beforeEach(() => {
  process.env.TURN_TOKEN_SECRET = "mail-games-test-secret-that-is-long-enough-123";
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.TURN_TOKEN_SECRET;
  else process.env.TURN_TOKEN_SECRET = originalSecret;
});

test("replay links are replayable signed tokens with a separate token type", () => {
  const token = createReplayToken({ matchId: "match-1", turnId: "turn-2", kickIndex: 0, recipientActor: "A" });
  const claims = verifyReplayToken(token);
  assert.equal(claims.tokenType, "replay");
  assert.equal(claims.kickIndex, 0);
  assert.throws(() => verifyTurnToken(token), /Invalid secure link/);
});

test("turn links cannot be used as replay links", () => {
  const token = createTurnToken({ matchId: "match-1", turnId: "turn-1", actor: "A" });
  assert.throws(() => verifyReplayToken(token), /Invalid secure link/);
});

test("0.8 replay token can carry a Turkey Fight round", () => {
  const token = createReplayToken({ matchId: "match-t", turnId: "turn-b", gameType: "turkey", round: 3, recipientActor: "A" });
  const claims = verifyReplayToken(token);
  assert.equal(claims.gameType, "turkey");
  assert.equal(claims.round, 3);
  assert.equal(claims.recipientActor, "A");
});
