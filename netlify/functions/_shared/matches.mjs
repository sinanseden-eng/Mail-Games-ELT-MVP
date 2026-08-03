import { randomUUID } from "node:crypto";
import { db, eq } from "./supabase.mjs";
import { createTurnToken } from "./token.mjs";
import { allowedMoves, currentTurn } from "./game-engine.mjs";
import { maskEmail } from "./test-access.mjs";

export async function chooseQuestion(packId) {
  const rows = await db("questions", {
    query: `pack_id=eq.${eq(packId)}&select=id,prompt,type,options,answer,explanation,level,tag&limit=100`
  });
  if (!rows?.length) {
    const error = new Error("The question pack is empty");
    error.statusCode = 400;
    throw error;
  }
  return rows[Math.floor(Math.random() * rows.length)];
}

export async function createPendingTurn(match, state) {
  const question = await chooseQuestion(match.question_pack_id);
  const turn = currentTurn(match.game_type, state);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const snapshot = {
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    explanation: question.explanation,
    level: question.level,
    tag: question.tag
  };

  const [created] = await db("match_turns", {
    method: "POST",
    body: {
      id,
      match_id: match.id,
      actor: turn.actor,
      role: turn.role,
      question_id: question.id,
      question_snapshot: snapshot,
      correct_answer: question.answer,
      expires_at: expiresAt,
      delivery_status: "pending"
    }
  });

  const token = createTurnToken({ matchId: match.id, turnId: created.id, actor: turn.actor });
  return { turn: created, token };
}

export async function recordTurnDelivery(turnId, recipientEmail, delivery) {
  const status = delivery?.sent ? "sent" : "failed";
  const rows = await db("match_turns", {
    method: "PATCH",
    query: `id=eq.${eq(turnId)}`,
    body: {
      delivery_status: status,
      delivery_provider_id: delivery?.id || null,
      delivery_error: delivery?.sent ? null : String(delivery?.reason || "Email delivery failed").slice(0, 500),
      delivery_recipient_masked: maskEmail(recipientEmail),
      delivery_attempted_at: new Date().toISOString()
    }
  });
  return rows?.[0] || null;
}

export function playerForActor(match, actor) {
  return actor === "A"
    ? { actor: "A", name: match.player_a_name, email: match.player_a_email }
    : { actor: "B", name: match.player_b_name, email: match.player_b_email };
}

export function turnUrl(token) {
  return secureSiteUrl(`/turn.html?token=${encodeURIComponent(token)}`);
}

export function replayUrl(token) {
  return secureSiteUrl(`/replay.html?token=${encodeURIComponent(token)}`);
}

function secureSiteUrl(path) {
  const site = (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
  if (!site) {
    const error = new Error("SITE_URL is not configured");
    error.statusCode = 503;
    throw error;
  }
  return `${site}${path}`;
}

export function publicMatch(match) {
  return {
    id: match.id,
    gameType: match.game_type,
    status: match.status,
    players: {
      A: match.player_a_name,
      B: match.player_b_name
    },
    state: structuredClone(match.state),
    expiresAt: match.expires_at
  };
}

export function publicMatchForTurn(match, turn) {
  const result = publicMatch(match);
  if (result.gameType === "penalty" && turn.role === "keeper") {
    // A keeper must never be able to inspect the striker's secret target in
    // the browser response before choosing a dive.
    result.state.shot = null;
    result.state.shotActive = null;
    result.state.shotTurnId = null;
  }
  if (result.gameType === "turkey" && turn.actor === "B") {
    // The second fighter completes the round, but must not see Player A's
    // move or whether it was activated before locking their own choice.
    result.state.moveA = null;
    result.state.activeA = null;
    result.state.moveATurnId = null;
  }
  if (result.gameType === "sniper" && turn.actor === "B") {
    // Player B must not see Player A's emergence position, prediction, or
    // answer status before locking both of their own secret choices.
    result.state.emergenceA = null;
    result.state.targetA = null;
    result.state.activeA = null;
    result.state.turnAId = null;
  }
  return result;
}
