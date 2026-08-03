import { json, methodNotAllowed, publicError } from "./_shared/http.mjs";
import { db, eq } from "./_shared/supabase.mjs";
import { verifyReplayToken } from "./_shared/token.mjs";
import { publicMatch } from "./_shared/matches.mjs";

export async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed(["GET"]);
  try {
    const claims = verifyReplayToken(event.queryStringParameters?.token);
    const finalTurns = await db("match_turns", {
      query: `id=eq.${eq(claims.turnId)}&match_id=eq.${eq(claims.matchId)}&select=id,match_id,actor,role,status,question_snapshot,submitted_answer,answer_correct,result_snapshot,submitted_at&limit=1`
    });
    const finalTurn = finalTurns?.[0];
    if (!finalTurn) notFound("Replay not found");
    if (finalTurn.status !== "submitted") gone("This result has not been resolved yet");

    const replay = finalTurn.result_snapshot?.replay;
    if (!replay || !["penalty", "turkey", "sniper"].includes(replay.gameType)) gone("This replay is not ready");
    if (claims.gameType && claims.gameType !== replay.gameType) forbidden();
    verifyReplayClaims(claims, replay);

    const matches = await db("matches", {
      query: `id=eq.${eq(claims.matchId)}&select=*&limit=1`
    });
    const match = matches?.[0];
    if (!match || !["active", "completed"].includes(match.status)) gone("This match replay is unavailable");

    const review = replay.gameType === "penalty"
      ? await penaltyReview(claims.matchId, replay, finalTurn)
      : replay.gameType === "sniper"
        ? await sniperReview(claims.matchId, replay, finalTurn)
        : await turkeyReview(claims.matchId, replay, finalTurn);

    const viewerRole = replay.gameType === "penalty"
      ? (claims.recipientActor === replay.keeper ? "keeper" : "striker")
      : "spectator";

    return json(200, {
      replay,
      match: publicMatch(match),
      review,
      viewer: {
        actor: claims.recipientActor || "",
        role: viewerRole
      }
    });
  } catch (error) {
    return publicError(error);
  }
}

function verifyReplayClaims(claims, replay) {
  if (replay.gameType === "penalty") {
    if (Number(replay.kickIndex) !== Number(claims.kickIndex)) forbidden();
    if (claims.recipientActor && claims.recipientActor !== replay.striker) forbidden();
    return;
  }
  if (Number(replay.round) !== Number(claims.round)) forbidden();
  if (claims.recipientActor && claims.recipientActor !== (replay.firstActor || "A")) forbidden();
}

async function penaltyReview(matchId, replay, keeperTurn) {
  const strikerTurn = await fetchTurn(matchId, replay.strikerTurnId);
  return {
    striker: reviewTurn(strikerTurn),
    keeper: reviewTurn(keeperTurn)
  };
}

async function turkeyReview(matchId, replay, turnB) {
  const turnA = await fetchTurn(matchId, replay.turnAId);
  return {
    A: reviewTurn(turnA),
    B: reviewTurn(turnB)
  };
}

async function sniperReview(matchId, replay, turnB) {
  const turnA = await fetchTurn(matchId, replay.turnAId);
  return {
    A: reviewTurn(turnA),
    B: reviewTurn(turnB)
  };
}

async function fetchTurn(matchId, turnId) {
  if (!turnId) return null;
  return (await db("match_turns", {
    query: `id=eq.${eq(turnId)}&match_id=eq.${eq(matchId)}&select=id,actor,role,status,question_snapshot,submitted_answer,answer_correct,submitted_at&limit=1`
  }))?.[0] || null;
}

function reviewTurn(turn) {
  if (!turn) return null;
  return {
    actor: turn.actor,
    role: turn.role,
    answerCorrect: Boolean(turn.answer_correct),
    submittedAnswer: turn.submitted_answer || "",
    question: {
      prompt: turn.question_snapshot?.prompt || "",
      explanation: turn.question_snapshot?.explanation || "",
      level: turn.question_snapshot?.level || "",
      tag: turn.question_snapshot?.tag || ""
    }
  };
}

function notFound(message) { const error = new Error(message); error.statusCode = 404; throw error; }
function forbidden() { const error = new Error("This replay link does not match the resolved result"); error.statusCode = 403; throw error; }
function gone(message) { const error = new Error(message); error.statusCode = 410; throw error; }
