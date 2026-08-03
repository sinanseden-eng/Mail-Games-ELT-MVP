import { randomUUID } from "node:crypto";
import { json, methodNotAllowed, parseJsonBody, publicError, safeText } from "./_shared/http.mjs";
import { db } from "./_shared/supabase.mjs";
import { defaultState } from "./_shared/game-engine.mjs";
import { createPendingTurn, playerForActor, publicMatch, recordTurnDelivery, turnUrl } from "./_shared/matches.mjs";
import { sendTurnEmail } from "./_shared/email.mjs";
import { requireAllowedRecipients, requireTestAccess } from "./_shared/test-access.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireTestAccess(event);
    const payload = parseJsonBody(event);
    const gameType = ["penalty", "turkey", "sniper"].includes(payload.gameType) ? payload.gameType : null;
    if (!gameType) bad("Choose penalty, turkey, or sniper");

    const playerA = validatePlayer(payload.playerA, "Player A");
    const playerB = validatePlayer(payload.playerB, "Player B");
    requireAllowedRecipients([playerA.email, playerB.email]);
    const questions = validateQuestions(payload.questions);
    const packName = safeText(payload.packName, 120) || "Match question pack";

    const [pack] = await db("question_packs", { method: "POST", body: { name: packName } });
    await db("questions", {
      method: "POST",
      body: questions.map(question => ({ ...question, id: randomUUID(), pack_id: pack.id }))
    });

    const state = defaultState(gameType);
    const [match] = await db("matches", {
      method: "POST",
      body: {
        game_type: gameType,
        player_a_name: playerA.name,
        player_a_email: playerA.email,
        player_b_name: playerB.name,
        player_b_email: playerB.email,
        question_pack_id: pack.id,
        state
      }
    });

    const pending = await createPendingTurn(match, state);
    const recipient = playerForActor(match, pending.turn.actor);
    const url = turnUrl(pending.token);
    const email = await sendTurnEmail({
      to: recipient.email,
      playerName: recipient.name,
      gameName: gameNameFor(gameType),
      url,
      role: pending.turn.role,
      matchLabel: packName,
      idempotencyKey: `mailgames-${pending.turn.id}`
    });
    await recordTurnDelivery(pending.turn.id, recipient.email, email);

    return json(201, {
      match: publicMatch(match),
      firstTurnUrl: url,
      email,
      testMode: true
    });
  } catch (error) {
    return publicError(error);
  }
}

function gameNameFor(gameType) {
  if (gameType === "penalty") return "Mail Penalty Shootout";
  if (gameType === "sniper") return "Sniper Elite!";
  return "Turkey Fight Mail";
}

function validatePlayer(value, fallback) {
  const name = safeText(value?.name, 80) || fallback;
  const email = safeText(value?.email, 254);
  if (!/^\S+@\S+\.\S+$/.test(email)) bad(`Enter a valid email for ${fallback}`);
  return { name, email };
}

function validateQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    bad("Include between 1 and 100 questions");
  }
  return value.map((item, index) => {
    const prompt = safeText(item.prompt, 1000);
    const type = ["multiple-choice", "true-false", "gap-fill"].includes(item.type) ? item.type : "multiple-choice";
    const options = type === "gap-fill"
      ? []
      : (Array.isArray(item.options) ? item.options : []).map(option => safeText(option, 300)).filter(Boolean).slice(0, 6);
    const answer = safeText(item.answer, 500);
    if (!prompt || !answer || (type !== "gap-fill" && options.length < 2)) {
      bad(`Question ${index + 1} is incomplete`);
    }
    return {
      prompt,
      type,
      options,
      answer,
      explanation: safeText(item.explanation, 1000),
      level: safeText(item.level, 20) || "B1",
      tag: safeText(item.tag, 80) || "General English"
    };
  });
}

function bad(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}
