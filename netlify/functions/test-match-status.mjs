import { json, methodNotAllowed, parseJsonBody, publicError, safeText } from "./_shared/http.mjs";
import { db, eq } from "./_shared/supabase.mjs";
import { createTurnToken } from "./_shared/token.mjs";
import { playerForActor, publicMatch, turnUrl } from "./_shared/matches.mjs";
import { maskEmail, requireTestAccess } from "./_shared/test-access.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);
  try {
    requireTestAccess(event);
    const payload = parseJsonBody(event);
    const matchId = safeText(payload.matchId, 80);
    if (!/^[0-9a-f-]{36}$/i.test(matchId)) bad("Enter a valid match ID");

    const matches = await db("matches", { query: `id=eq.${eq(matchId)}&select=*&limit=1` });
    const match = matches?.[0];
    if (!match) notFound("Match not found");

    const turns = await db("match_turns", {
      query: `match_id=eq.${eq(matchId)}&status=eq.pending&select=id,actor,role,status,expires_at,delivery_status,delivery_provider_id,delivery_error,delivery_recipient_masked,delivery_attempted_at&limit=1`
    });
    const pending = turns?.[0] || null;
    let recoveryTurnUrl = null;
    let recipient = null;
    if (pending && new Date(pending.expires_at).getTime() > Date.now()) {
      const secondsRemaining = Math.max(60, Math.floor((new Date(pending.expires_at).getTime() - Date.now()) / 1000));
      const token = createTurnToken({ matchId: match.id, turnId: pending.id, actor: pending.actor }, secondsRemaining);
      recoveryTurnUrl = turnUrl(token);
      const player = playerForActor(match, pending.actor);
      recipient = { actor: pending.actor, name: player.name, email: maskEmail(player.email) };
    }

    return json(200, {
      match: publicMatch(match),
      pending: pending ? {
        id: pending.id,
        actor: pending.actor,
        role: pending.role,
        status: pending.status,
        expiresAt: pending.expires_at,
        delivery: {
          status: pending.delivery_status,
          providerId: pending.delivery_provider_id,
          error: pending.delivery_error,
          recipient: pending.delivery_recipient_masked,
          attemptedAt: pending.delivery_attempted_at
        },
        recipient,
        recoveryTurnUrl
      } : null
    });
  } catch (error) {
    return publicError(error);
  }
}

function bad(message) { const error = new Error(message); error.statusCode = 400; throw error; }
function notFound(message) { const error = new Error(message); error.statusCode = 404; throw error; }
