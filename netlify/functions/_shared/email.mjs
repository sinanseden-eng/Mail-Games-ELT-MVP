import { safeText } from "./http.mjs";

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function emailProviderStatus(env = process.env) {
  const requestedRaw = safeText(env.MAILGAMES_EMAIL_PROVIDER, 20).toLowerCase();
  const requested = ["gmail", "resend"].includes(requestedRaw) ? requestedRaw : "auto";
  const gmailConfigured = Boolean(
    env.GMAIL_CLIENT_ID &&
    env.GMAIL_CLIENT_SECRET &&
    env.GMAIL_REFRESH_TOKEN &&
    validEmail(env.GMAIL_SENDER_EMAIL)
  );
  const resendConfigured = Boolean(env.RESEND_API_KEY && env.MAILGAMES_FROM_EMAIL);

  let provider = null;
  if (requested === "gmail") provider = gmailConfigured ? "gmail" : null;
  else if (requested === "resend") provider = resendConfigured ? "resend" : null;
  else provider = gmailConfigured ? "gmail" : resendConfigured ? "resend" : null;

  return {
    configured: Boolean(provider),
    provider: provider || "missing",
    requested,
    gmailConfigured,
    resendConfigured
  };
}

export async function sendTurnEmail({ to, playerName, gameName, url, role, idempotencyKey, matchLabel = "" }) {
  const safePlayer = safeText(playerName, 80);
  const safeGame = safeText(gameName, 100);
  const safeRole = safeText(role, 60);
  const safeMatch = safeText(matchLabel, 80);
  const subject = `${safePlayer}, your ${safeRole} turn is ready`;
  const intro = `Answer one English question to activate your ${safeRole} move in ${safeGame}.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172032">
      <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#edf1ff;color:#3056d3;font-weight:700">Mail Games ELT</div>
      <h1 style="font-size:30px;line-height:1.1">${escapeHtml(safePlayer)}, it is your turn.</h1>
      <p style="font-size:16px;line-height:1.6;color:#58647a">${escapeHtml(intro)}</p>
      ${safeMatch ? `<p style="font-size:13px;color:#7a8497">Match: ${escapeHtml(safeMatch)}</p>` : ""}
      <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#3056d3;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px">Play your turn</a></p>
      <p style="font-size:13px;color:#7a8497">This link is single-use and expires automatically. Do not forward it.</p>
    </div>`;
  const text = `${safePlayer}, it is your turn in ${safeGame}. ${intro}\n\nPlay: ${url}\n\nThis single-use link expires automatically and should not be forwarded.`;

  return sendEmailMessage({ to, subject, html, text, idempotencyKey });
}

export async function sendPenaltyResultEmail({
  to,
  playerName,
  url,
  replay,
  matchLabel = "",
  idempotencyKey = ""
}) {
  const safePlayer = safeText(playerName, 80);
  const safeMatch = safeText(matchLabel, 80);
  const outcome = ["goal", "save", "miss"].includes(replay?.outcome) ? replay.outcome : "result";
  const outcomeLabel = outcome === "goal" ? "GOAL" : outcome === "save" ? "SAVED" : outcome === "miss" ? "MISS" : "RESULT";
  const subject = `${safePlayer}, your penalty result is ready: ${outcomeLabel}`;
  const score = `${Number(replay?.scoreA || 0)}–${Number(replay?.scoreB || 0)}`;
  const caption = safeText(replay?.caption || replay?.message || "Your penalty has been resolved.", 240);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172032">
      <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#edf1ff;color:#3056d3;font-weight:700">Mail Games ELT</div>
      <h1 style="font-size:30px;line-height:1.1">${escapeHtml(safePlayer)}, watch the penalty.</h1>
      <p style="font-size:20px;font-weight:800;color:#24345f">${escapeHtml(outcomeLabel)} · ${escapeHtml(score)}</p>
      <p style="font-size:16px;line-height:1.6;color:#58647a">${escapeHtml(caption)}</p>
      ${safeMatch ? `<p style="font-size:13px;color:#7a8497">Match: ${escapeHtml(safeMatch)}</p>` : ""}
      <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#3056d3;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px">Watch the penalty</a></p>
      <p style="font-size:13px;color:#7a8497">This signed replay link can be opened again until it expires. Do not forward it.</p>
    </div>`;
  const text = `${safePlayer}, your penalty result is ready: ${outcomeLabel}. Score: ${score}. ${caption}\n\nWatch the penalty: ${url}\n\nThis signed replay link can be opened again until it expires.`;

  return sendEmailMessage({ to, subject, html, text, idempotencyKey });
}

export async function sendTurkeyResultEmail({
  to,
  playerName,
  url,
  replay,
  matchLabel = "",
  idempotencyKey = ""
}) {
  const safePlayer = safeText(playerName, 80);
  const safeMatch = safeText(matchLabel, 80);
  const health = `${Number(replay?.healthA || 0)}–${Number(replay?.healthB || 0)}`;
  const caption = safeText(replay?.caption || replay?.message || "The turkey fight round has been resolved.", 240);
  const round = Math.max(1, Number(replay?.round || 1));
  const subject = `${safePlayer}, Turkey Fight round ${round} is ready`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#251b2a">
      <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#f5e8f4;color:#712c77;font-weight:700">Mail Games ELT</div>
      <h1 style="font-size:30px;line-height:1.1">${escapeHtml(safePlayer)}, watch the feather fight.</h1>
      <p style="font-size:20px;font-weight:800;color:#8f3347">ROUND ${round} · HEALTH ${escapeHtml(health)}</p>
      <p style="font-size:16px;line-height:1.6;color:#665b69">${escapeHtml(caption)}</p>
      ${safeMatch ? `<p style="font-size:13px;color:#887b8b">Match: ${escapeHtml(safeMatch)}</p>` : ""}
      <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#7a326f;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px">Watch the fight</a></p>
      <p style="font-size:13px;color:#887b8b">This signed replay link can be opened again until it expires. Do not forward it.</p>
    </div>`;
  const text = `${safePlayer}, Turkey Fight round ${round} is ready. Health: ${health}. ${caption}

Watch the fight: ${url}

This signed replay link can be opened again until it expires.`;

  return sendEmailMessage({ to, subject, html, text, idempotencyKey });
}

export async function sendSniperResultEmail({
  to,
  playerName,
  url,
  replay,
  matchLabel = "",
  idempotencyKey = ""
}) {
  const safePlayer = safeText(playerName, 80);
  const safeMatch = safeText(matchLabel, 80);
  const health = `${Number(replay?.healthA ?? 0)}–${Number(replay?.healthB ?? 0)}`;
  const caption = safeText(replay?.caption || replay?.message || "The training round has been resolved.", 240);
  const round = Math.max(1, Number(replay?.round || 1));
  const subject = `${safePlayer}, Sniper Elite training round ${round} is ready`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172027">
      <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#fff0d2;color:#8a5616;font-weight:700">Mail Games ELT</div>
      <h1 style="font-size:30px;line-height:1.1">${escapeHtml(safePlayer)}, watch the prediction round.</h1>
      <p style="font-size:20px;font-weight:800;color:#304a5d">ROUND ${round} · HEALTH ${escapeHtml(health)}</p>
      <p style="font-size:16px;line-height:1.6;color:#5d6870">${escapeHtml(caption)}</p>
      ${safeMatch ? `<p style="font-size:13px;color:#7f898f">Match: ${escapeHtml(safeMatch)}</p>` : ""}
      <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#9b5b22;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px">Watch the round</a></p>
      <p style="font-size:13px;color:#7f898f">This is a non-graphic training-game replay. The signed link can be reopened until it expires.</p>
    </div>`;
  const text = `${safePlayer}, Sniper Elite training round ${round} is ready. Health: ${health}. ${caption}

Watch the round: ${url}

This signed replay link can be opened again until it expires.`;

  return sendEmailMessage({ to, subject, html, text, idempotencyKey });
}

export async function sendEmailMessage({ to, subject, html = "", text = "", idempotencyKey = "" }) {
  const recipient = safeText(to, 254).toLowerCase();
  if (!validEmail(recipient)) return { sent: false, reason: "Invalid recipient email" };

  const status = emailProviderStatus();
  if (!status.configured) {
    const reason = status.requested === "gmail"
      ? "Gmail API is selected but its OAuth variables are incomplete"
      : status.requested === "resend"
        ? "Resend is selected but its variables are incomplete"
        : "Email is not configured";
    return { sent: false, reason, provider: status.provider };
  }

  const message = {
    to: recipient,
    subject: safeText(subject, 180),
    html: String(html || ""),
    text: String(text || ""),
    idempotencyKey: safeText(idempotencyKey, 256)
  };

  return status.provider === "gmail"
    ? sendViaGmail(message)
    : sendViaResend(message);
}

async function sendViaGmail(message) {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token"
      })
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      return {
        sent: false,
        provider: "gmail",
        reason: tokenData.error_description || tokenData.error || "Google could not refresh the Gmail access token",
        providerStatus: tokenResponse.status
      };
    }

    const raw = buildGmailRawMessage(message);
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        sent: false,
        provider: "gmail",
        reason: data.error?.message || "Gmail API rejected the message",
        providerStatus: response.status
      };
    }
    return { sent: true, id: data.id, threadId: data.threadId, provider: "gmail" };
  } catch (error) {
    return { sent: false, provider: "gmail", reason: error.message || "Gmail delivery failed" };
  }
}

async function sendViaResend(message) {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    };
    if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: process.env.MAILGAMES_FROM_EMAIL,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        sent: false,
        provider: "resend",
        reason: data.message || "Email provider rejected the request",
        providerStatus: response.status
      };
    }
    return { sent: true, id: data.id, provider: "resend" };
  } catch (error) {
    return { sent: false, provider: "resend", reason: error.message || "Email delivery failed" };
  }
}

function buildGmailRawMessage(message) {
  const senderEmail = safeText(process.env.GMAIL_SENDER_EMAIL, 254).toLowerCase();
  const senderName = cleanHeader(process.env.MAILGAMES_SENDER_NAME || "Mail Games ELT", 80);
  const boundary = `mailgames_${Buffer.from(message.idempotencyKey || `${Date.now()}-${message.to}`)
    .toString("base64url")
    .slice(0, 32)}`;
  const messageIdSeed = (message.idempotencyKey || `${Date.now()}-${message.to}`)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 160);
  const headers = [
    `From: ${encodeHeader(senderName)} <${senderEmail}>`,
    `To: ${message.to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Message-ID: <${messageIdSeed}@mailgames.local>`,
    `X-MailGames-Scope: ${GMAIL_SEND_SCOPE}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ];
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(message.text || stripHtml(message.html), "utf8").toString("base64")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(Buffer.from(message.html || escapeHtml(message.text), "utf8").toString("base64")),
    `--${boundary}--`,
    ""
  ];
  return Buffer.from([...headers, "", ...body].join("\r\n"), "utf8").toString("base64url");
}

function wrapBase64(value) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

function encodeHeader(value) {
  const clean = cleanHeader(value, 180);
  return /^[\x20-\x7E]*$/.test(clean)
    ? clean
    : `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function cleanHeader(value, maxLength) {
  return safeText(value, maxLength).replace(/[\r\n]+/g, " ");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function validEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || "").trim());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
