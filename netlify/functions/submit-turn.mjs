import { json, methodNotAllowed, normalizeAnswer, parseJsonBody, publicError, safeText } from "./_shared/http.mjs";
import { db, eq } from "./_shared/supabase.mjs";
import { createReplayToken, verifyTurnToken } from "./_shared/token.mjs";
import { allowedMoves, applyTurn } from "./_shared/game-engine.mjs";
import {
  createPendingTurn,
  playerForActor,
  publicMatch,
  recordTurnDelivery,
  replayUrl,
  turnUrl
} from "./_shared/matches.mjs";
import { sendPenaltyResultEmail, sendSniperResultEmail, sendTurkeyResultEmail, sendTurnEmail } from "./_shared/email.mjs";
import { requireAllowedRecipients } from "./_shared/test-access.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);
  try {
    const payload = parseJsonBody(event);
    const claims = verifyTurnToken(payload.token);
    const submittedAnswer = safeText(payload.answer, 500);
    const move = safeText(payload.move, 80);
    const emergence = safeText(payload.emergence, 80);
    const target = safeText(payload.target, 80);
    if (!submittedAnswer) bad("Answer the question first");

    const turns = await db("match_turns", {
      query: `id=eq.${eq(claims.turnId)}&match_id=eq.${eq(claims.matchId)}&select=*&limit=1`
    });
    const turn = turns?.[0];
    if (!turn) notFound("Turn not found");
    if (turn.actor !== claims.actor) forbidden();
    if (turn.status !== "pending") gone("This turn has already been submitted");
    if (new Date(turn.expires_at).getTime() <= Date.now()) gone("This turn has expired");

    const matches = await db("matches", { query: `id=eq.${eq(claims.matchId)}&select=*&limit=1` });
    const match = matches?.[0];
    if (!match || match.status !== "active") gone("This match is no longer active");
    requireAllowedRecipients([match.player_a_email, match.player_b_email]);
    if (match.game_type === "sniper") {
      if (!allowedMoves("sniper").includes(emergence) || !allowedMoves("sniper").includes(target)) {
        bad("Choose a valid emergence position and target prediction");
      }
    } else if (!allowedMoves(match.game_type).includes(move)) {
      bad("Choose a valid move");
    }

    const answerCorrect = normalizeAnswer(submittedAnswer) === normalizeAnswer(turn.correct_answer);
    const outcome = applyTurn(match.game_type, match.state, {
      actor: turn.actor,
      move,
      emergence,
      target,
      answerCorrect
    });

    attachReplayTurnIds({ match, turn, outcome });

    const updatedTurns = await db("match_turns", {
      method: "PATCH",
      query: `id=eq.${eq(turn.id)}&status=eq.pending`,
      body: {
        status: "submitted",
        submitted_answer: submittedAnswer,
        answer_correct: answerCorrect,
        move: match.game_type === "sniper" ? JSON.stringify({ emergence, target }) : move,
        result_snapshot: {
          message: outcome.message,
          resolved: outcome.resolved,
          replay: outcome.replay || null
        },
        submitted_at: new Date().toISOString()
      }
    });
    if (!updatedTurns?.length) gone("This turn was already submitted");

    const [updatedMatch] = await db("matches", {
      method: "PATCH",
      query: `id=eq.${eq(match.id)}`,
      body: {
        state: outcome.state,
        status: outcome.completed ? "completed" : "active"
      }
    });

    const resultEmail = outcome.replay
      ? await sendResolvedResultEmail(updatedMatch, turn, outcome.replay)
      : null;

    if (outcome.completed) {
      return json(200, {
        answerCorrect,
        explanation: turn.question_snapshot?.explanation || "",
        outcome,
        match: publicMatch(updatedMatch),
        completed: true,
        resultEmail
      });
    }

    const pending = await createPendingTurn(updatedMatch, outcome.state);
    const recipient = playerForActor(updatedMatch, pending.turn.actor);
    const url = turnUrl(pending.token);
    const email = await sendTurnEmail({
      to: recipient.email,
      playerName: recipient.name,
      gameName: gameNameFor(updatedMatch.game_type),
      url,
      role: pending.turn.role,
      matchLabel: `Match ${updatedMatch.id.slice(0, 8)}`,
      idempotencyKey: `mailgames-${pending.turn.id}`
    });
    await recordTurnDelivery(pending.turn.id, recipient.email, email);

    return json(200, {
      answerCorrect,
      explanation: turn.question_snapshot?.explanation || "",
      outcome,
      match: publicMatch(updatedMatch),
      completed: false,
      resultEmail,
      next: { actor: pending.turn.actor, email }
    });
  } catch (error) {
    return publicError(error);
  }
}

function attachReplayTurnIds({ match, turn, outcome }) {
  if (match.game_type === "penalty") {
    if (!outcome.resolved && turn.role === "striker") {
      outcome.state.shotTurnId = turn.id;
      return;
    }
    if (!outcome.replay) return;
    outcome.replay.strikerTurnId = match.state?.shotTurnId || null;
    outcome.replay.keeperTurnId = turn.id;
    replaceLatestReplay(outcome.state, outcome.replay);
    return;
  }

  if (match.game_type === "turkey") {
    if (!outcome.resolved && turn.actor === "A") {
      outcome.state.moveATurnId = turn.id;
      return;
    }
    if (!outcome.replay) return;
    outcome.replay.turnAId = match.state?.moveATurnId || null;
    outcome.replay.turnBId = turn.id;
    replaceLatestReplay(outcome.state, outcome.replay);
    return;
  }

  if (match.game_type === "sniper") {
    if (!outcome.resolved && turn.actor === "A") {
      outcome.state.turnAId = turn.id;
      return;
    }
    if (!outcome.replay) return;
    outcome.replay.turnAId = match.state?.turnAId || null;
    outcome.replay.turnBId = turn.id;
    replaceLatestReplay(outcome.state, outcome.replay);
  }
}

function replaceLatestReplay(state, replay) {
  const history = state?.history;
  if (Array.isArray(history) && history.length) {
    history[history.length - 1] = structuredClone(replay);
  }
}

async function sendResolvedResultEmail(match, finalTurn, replay) {
  if (replay.gameType === "turkey") return sendResolvedTurkeyEmail(match, finalTurn, replay);
  if (replay.gameType === "sniper") return sendResolvedSniperEmail(match, finalTurn, replay);
  return sendResolvedPenaltyEmail(match, finalTurn, replay);
}

async function sendResolvedPenaltyEmail(match, keeperTurn, replay) {
  const token = createReplayToken({
    matchId: match.id,
    turnId: keeperTurn.id,
    gameType: "penalty",
    kickIndex: replay.kickIndex,
    recipientActor: replay.striker
  });
  const url = replayUrl(token);
  const recipient = playerForActor(match, replay.striker);
  const email = await sendPenaltyResultEmail({
    to: recipient.email,
    playerName: recipient.name,
    url,
    replay,
    matchLabel: `Match ${match.id.slice(0, 8)}`,
    idempotencyKey: `mailgames-replay-penalty-${keeperTurn.id}`
  });
  return {
    ...email,
    actor: replay.striker,
    gameType: "penalty",
    replayReady: true
  };
}

async function sendResolvedTurkeyEmail(match, finalTurn, replay) {
  const recipientActor = replay.firstActor || "A";
  const token = createReplayToken({
    matchId: match.id,
    turnId: finalTurn.id,
    gameType: "turkey",
    round: replay.round,
    recipientActor
  });
  const url = replayUrl(token);
  const recipient = playerForActor(match, recipientActor);
  const email = await sendTurkeyResultEmail({
    to: recipient.email,
    playerName: recipient.name,
    url,
    replay,
    matchLabel: `Match ${match.id.slice(0, 8)}`,
    idempotencyKey: `mailgames-replay-turkey-${finalTurn.id}`
  });
  return {
    ...email,
    actor: recipientActor,
    gameType: "turkey",
    replayReady: true
  };
}

async function sendResolvedSniperEmail(match, finalTurn, replay) {
  const recipientActor = replay.firstActor || "A";
  const token = createReplayToken({
    matchId: match.id,
    turnId: finalTurn.id,
    gameType: "sniper",
    round: replay.round,
    recipientActor
  });
  const url = replayUrl(token);
  const recipient = playerForActor(match, recipientActor);
  const email = await sendSniperResultEmail({
    to: recipient.email,
    playerName: recipient.name,
    url,
    replay,
    matchLabel: `Match ${match.id.slice(0, 8)}`,
    idempotencyKey: `mailgames-replay-sniper-${finalTurn.id}`
  });
  return {
    ...email,
    actor: recipientActor,
    gameType: "sniper",
    replayReady: true
  };
}

function gameNameFor(gameType) {
  if (gameType === "penalty") return "Mail Penalty Shootout";
  if (gameType === "sniper") return "Sniper Elite!";
  return "Turkey Fight Mail";
}

function bad(message) { const error = new Error(message); error.statusCode = 400; throw error; }
function notFound(message) { const error = new Error(message); error.statusCode = 404; throw error; }
function forbidden() { const error = new Error("This turn belongs to another player"); error.statusCode = 403; throw error; }
function gone(message) { const error = new Error(message); error.statusCode = 410; throw error; }
