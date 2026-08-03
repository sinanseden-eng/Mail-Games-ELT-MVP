import { json, methodNotAllowed, parseJsonBody, safeText } from "./_shared/http.mjs";
import { sendEmailMessage } from "./_shared/email.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {}, { "Access-Control-Allow-Origin": "*" });
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);

  let payload;
  try {
    payload = parseJsonBody(event);
  } catch (error) {
    return json(400, { error: error.message });
  }

  const to = safeText(payload.to, 254);
  const gameName = safeText(payload.gameName, 80) || "Mail Games ELT";
  const playerName = safeText(payload.playerName, 80) || "A classmate";
  const turnUrl = safeText(payload.turnUrl, 500);

  if (!/^\S+@\S+\.\S+$/.test(to)) return json(400, { error: "Invalid email address" });
  if (!/^https?:\/\//i.test(turnUrl)) return json(400, { error: "Invalid turn URL" });

  const subject = `${playerName} challenged you to ${gameName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172032">
      <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#edf1ff;color:#3056d3;font-weight:700">Mail Games ELT</div>
      <h1 style="font-size:30px;line-height:1.1">Your turn in ${escapeHtml(gameName)}</h1>
      <p style="font-size:16px;line-height:1.6;color:#58647a">${escapeHtml(playerName)} has challenged you. Answer an English question correctly to activate your move.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(turnUrl)}" style="display:inline-block;background:#3056d3;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px">Play your turn</a></p>
      <p style="font-size:13px;color:#7a8497">This invitation is single-use and tied to one match turn.</p>
    </div>`;
  const text = `${playerName} challenged you to ${gameName}. Play your turn: ${turnUrl}`;
  const delivery = await sendEmailMessage({ to, subject, html, text, idempotencyKey: safeText(payload.idempotencyKey, 256) });
  if (!delivery.sent) return json(delivery.providerStatus || 503, { error: delivery.reason, provider: delivery.provider });
  return json(200, { ok: true, id: delivery.id, provider: delivery.provider });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
