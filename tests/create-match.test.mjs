import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_server_test_key";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.TURN_TOKEN_SECRET = "a-secure-test-secret-with-more-than-32-characters";
process.env.SITE_URL = "https://mail-games.example";
process.env.MAILGAMES_EMAIL_PROVIDER = "gmail";
process.env.GMAIL_CLIENT_ID = "gmail-client-id";
process.env.GMAIL_CLIENT_SECRET = "gmail-client-secret";
process.env.GMAIL_REFRESH_TOKEN = "gmail-refresh-token";
process.env.GMAIL_SENDER_EMAIL = "teacher@gmail.com";
process.env.MAILGAMES_SENDER_NAME = "Mail Games ELT";
delete process.env.RESEND_API_KEY;
delete process.env.MAILGAMES_FROM_EMAIL;
process.env.MAILGAMES_TEST_CODE = "private-test-code-123";
process.env.MAIL_TEST_ALLOWED_RECIPIENTS = "a@example.com,b@example.com";

const requests = [];
const realFetch = globalThis.fetch;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const method = options.method || "GET";
  const rawBody = options.body;
  let body;
  if (typeof rawBody === "string") {
    try { body = JSON.parse(rawBody); }
    catch { body = rawBody; }
  } else body = rawBody;
  requests.push({ target, method, body, headers: options.headers || {} });

  if (target === "https://oauth2.googleapis.com/token") {
    return response({ access_token: "gmail-access-token", expires_in: 3600, token_type: "Bearer" });
  }
  if (target === "https://gmail.googleapis.com/gmail/v1/users/me/messages/send") {
    return response({ id: "gmail-message-1", threadId: "gmail-thread-1" });
  }

  const table = new URL(target).pathname.split("/").at(-1);
  if (table === "question_packs" && method === "POST") {
    return response([{ id: "11111111-1111-4111-8111-111111111111", ...body }]);
  }
  if (table === "questions" && method === "POST") return response(body);
  if (table === "questions" && method === "GET") {
    return response([{
      id: "22222222-2222-4222-8222-222222222222",
      prompt: "She ___ here since 2023.",
      type: "multiple-choice",
      options: ["works", "worked", "has worked", "is working"],
      answer: "has worked",
      explanation: "Use present perfect with since.",
      level: "B1",
      tag: "Present Perfect"
    }]);
  }
  if (table === "matches" && method === "POST") {
    return response([{
      id: "33333333-3333-4333-8333-333333333333",
      status: "active",
      expires_at: "2026-08-15T00:00:00.000Z",
      ...body
    }]);
  }
  if (table === "match_turns" && method === "POST") return response([{ ...body }]);
  if (table === "match_turns" && method === "PATCH") return response([{ id: "turn-1", ...body }]);

  return response({ message: `Unexpected request: ${method} ${target}` }, 500);
};

const { handler } = await import("../netlify/functions/create-match.mjs");

test.after(() => { globalThis.fetch = realFetch; });

test("protected launch creates a match, records Gmail delivery, and sends a MIME message", async () => {
  requests.length = 0;
  const result = await handler(eventFor("private-test-code-123", "a@example.com", "b@example.com"));

  assert.equal(result.statusCode, 201);
  const payload = JSON.parse(result.body);
  assert.equal(payload.match.id, "33333333-3333-4333-8333-333333333333");
  assert.equal(payload.email.sent, true);
  assert.equal(payload.email.provider, "gmail");
  assert.match(payload.firstTurnUrl, /^https:\/\/mail-games\.example\/turn\.html\?token=/);

  const tokenRequest = requests.find(request => request.target === "https://oauth2.googleapis.com/token");
  assert.ok(tokenRequest);
  assert.match(String(tokenRequest.body), /grant_type=refresh_token/);

  const gmail = requests.find(request => request.target.includes("gmail.googleapis.com/gmail/v1/users/me/messages/send"));
  assert.ok(gmail);
  assert.equal(gmail.headers.Authorization, "Bearer gmail-access-token");
  const mime = Buffer.from(gmail.body.raw, "base64url").toString("utf8");
  assert.match(mime, /From: Mail Games ELT <teacher@gmail\.com>/);
  assert.match(mime, /To: a@example\.com/);
  assert.match(mime, /Message-ID: <mailgames-/);

  const deliveryPatch = requests.find(request => request.target.includes("/match_turns?") && request.method === "PATCH");
  assert.equal(deliveryPatch.body.delivery_status, "sent");
  assert.equal(deliveryPatch.body.delivery_provider_id, "gmail-message-1");

  const supabaseRequest = requests.find(request => request.target.includes("project.supabase.co/rest/v1"));
  assert.equal(supabaseRequest.headers.apikey, "sb_secret_server_test_key");
  assert.equal("Authorization" in supabaseRequest.headers, false);
});

test("0.9A protected launch accepts Sniper Elite and creates a three-health state", async () => {
  requests.length = 0;
  const result = await handler(eventFor("private-test-code-123", "a@example.com", "b@example.com", "sniper"));
  assert.equal(result.statusCode, 201);
  const payload = JSON.parse(result.body);
  assert.equal(payload.match.gameType, "sniper");
  assert.equal(payload.match.state.healthA, 3);
  assert.equal(payload.match.state.healthB, 3);
  assert.equal(payload.match.state.maxRounds, 5);
  const matchCreate = requests.find(request => request.target.includes("/matches") && request.method === "POST");
  assert.equal(matchCreate.body.game_type, "sniper");
});

test("rejects an incorrect private test code before database writes", async () => {
  requests.length = 0;
  const result = await handler(eventFor("wrong-code-value", "a@example.com", "b@example.com"));
  assert.equal(result.statusCode, 403);
  assert.equal(requests.length, 0);
});

test("rejects recipients outside the protected allowlist", async () => {
  requests.length = 0;
  const result = await handler(eventFor("private-test-code-123", "a@example.com", "outsider@example.com"));
  assert.equal(result.statusCode, 403);
  assert.equal(requests.length, 0);
});

function eventFor(code, a, b, gameType = "penalty") {
  return {
    httpMethod: "POST",
    headers: { "x-mailgames-test-code": code },
    body: JSON.stringify({
      gameType,
      packName: "B1 Revision",
      playerA: { name: "Student A", email: a },
      playerB: { name: "Student B", email: b },
      questions: [{
        prompt: "She ___ here since 2023.",
        type: "multiple-choice",
        options: ["works", "worked", "has worked", "is working"],
        answer: "has worked",
        explanation: "Use present perfect with since.",
        level: "B1",
        tag: "Present Perfect"
      }]
    })
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
