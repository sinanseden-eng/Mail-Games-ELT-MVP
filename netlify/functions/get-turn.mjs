import { json, methodNotAllowed, publicError } from "./_shared/http.mjs";
import { db, eq } from "./_shared/supabase.mjs";
import { verifyTurnToken } from "./_shared/token.mjs";
import { allowedMoves } from "./_shared/game-engine.mjs";
import { publicMatchForTurn } from "./_shared/matches.mjs";

export async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed(["GET"]);
  try {
    const claims = verifyTurnToken(event.queryStringParameters?.token);
    const turns = await db("match_turns", {
      query: `id=eq.${eq(claims.turnId)}&match_id=eq.${eq(claims.matchId)}&select=id,match_id,actor,role,status,question_snapshot,expires_at&limit=1`
    });
    const turn = turns?.[0];
    if (!turn) notFound("Turn not found");
    if (turn.actor !== claims.actor) forbidden();
    if (turn.status !== "pending") gone("This turn has already been used");
    if (new Date(turn.expires_at).getTime() <= Date.now()) gone("This turn has expired");

    const matches = await db("matches", {
      query: `id=eq.${eq(claims.matchId)}&select=*&limit=1`
    });
    const match = matches?.[0];
    if (!match || match.status !== "active") gone("This match is no longer active");

    return json(200, {
      turn: {
        id: turn.id,
        actor: turn.actor,
        role: turn.role,
        question: turn.question_snapshot,
        moves: allowedMoves(match.game_type),
        expiresAt: turn.expires_at
      },
      match: publicMatchForTurn(match, turn)
    });
  } catch (error) {
    return publicError(error);
  }
}

function notFound(message) { const error = new Error(message); error.statusCode = 404; throw error; }
function forbidden() { const error = new Error("This turn belongs to another player"); error.statusCode = 403; throw error; }
function gone(message) { const error = new Error(message); error.statusCode = 410; throw error; }
