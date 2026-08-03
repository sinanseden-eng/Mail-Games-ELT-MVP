import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_server_test_key";
process.env.TURN_TOKEN_SECRET = "a-secure-test-secret-with-more-than-32-characters";
process.env.SITE_URL = "https://mail-games.example";
process.env.MAILGAMES_EMAIL_PROVIDER = "gmail";
process.env.GMAIL_CLIENT_ID = "gmail-client-id";
process.env.GMAIL_CLIENT_SECRET = "gmail-client-secret";
process.env.GMAIL_REFRESH_TOKEN = "gmail-refresh-token";
process.env.GMAIL_SENDER_EMAIL = "teacher@gmail.com";
process.env.MAILGAMES_SENDER_NAME = "Mail Games ELT";
process.env.MAIL_TEST_ALLOWED_RECIPIENTS = "a@example.com,b@example.com";

const matchId = "73333333-3333-4333-8333-333333333333";
const turnBId = "74444444-4444-4444-8444-444444444444";
const turnAId = "75555555-5555-4555-8555-555555555555";
const match = {
  id: matchId,
  game_type: "sniper",
  status: "active",
  player_a_name: "Aylin",
  player_a_email: "a@example.com",
  player_b_name: "Bora",
  player_b_email: "b@example.com",
  question_pack_id: "71111111-1111-4111-8111-111111111111",
  expires_at: "2099-01-01T00:00:00.000Z",
  state: {
    round: 1,
    maxRounds: 5,
    phase: "B",
    healthA: 3,
    healthB: 3,
    streakA: 1,
    streakB: 0,
    emergenceA: "rooftop",
    targetA: "broken-wall",
    emergenceB: null,
    targetB: null,
    activeA: true,
    activeB: false,
    turnAId,
    history: [],
    finished: false,
    winner: null
  }
};
const turnB = {
  id: turnBId,
  match_id: matchId,
  actor: "B",
  role: "sniper",
  status: "pending",
  correct_answer: "had",
  question_snapshot: { prompt: "If I ___ more time...", explanation: "Use past simple." },
  expires_at: "2099-01-01T00:00:00.000Z"
};

const requests = [];
const realFetch = globalThis.fetch;
let gmailCounter = 0;
let currentMatch = structuredClone(match);

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const method = options.method || "GET";
  let body = options.body;
  if (typeof body === "string" && options.headers?.["Content-Type"] === "application/json") {
    try { body = JSON.parse(body); } catch {}
  }
  requests.push({ target, method, body, headers: options.headers || {} });

  if (target === "https://oauth2.googleapis.com/token") return response({ access_token: "gmail-access-token" });
  if (target === "https://gmail.googleapis.com/gmail/v1/users/me/messages/send") {
    gmailCounter += 1;
    return response({ id: `gmail-sniper-${gmailCounter}`, threadId: `thread-sniper-${gmailCounter}` });
  }

  const parsed = new URL(target);
  const table = parsed.pathname.split("/").at(-1);
  if (table === "match_turns" && method === "GET") return response([turnB]);
  if (table === "matches" && method === "GET") return response([currentMatch]);
  if (table === "match_turns" && method === "PATCH") return response([{ ...turnB, ...body }]);
  if (table === "matches" && method === "PATCH") {
    currentMatch = { ...currentMatch, ...body };
    return response([currentMatch]);
  }
  if (table === "questions" && method === "GET") {
    return response([{
      id: "72222222-2222-4222-8222-222222222222",
      prompt: "She ___ here since 2023.",
      type: "multiple-choice",
      options: ["works", "worked", "has worked", "is working"],
      answer: "has worked",
      explanation: "Use present perfect with since.",
      level: "B1",
      tag: "Present Perfect"
    }]);
  }
  if (table === "match_turns" && method === "POST") return response([{ ...body }]);
  return response({ message: `Unexpected request: ${method} ${target}` }, 500);
};

const { createTurnToken } = await import("../netlify/functions/_shared/token.mjs");
const { handler } = await import("../netlify/functions/submit-turn.mjs");

test.after(() => { globalThis.fetch = realFetch; });

test("0.9A Player B submission resolves both predictions, emails Player A a replay, and starts the next round", async () => {
  requests.length = 0;
  gmailCounter = 0;
  currentMatch = structuredClone(match);
  const token = createTurnToken({ matchId, turnId: turnBId, actor: "B" });
  const result = await handler({
    httpMethod: "POST",
    body: JSON.stringify({
      token,
      answer: "had",
      emergence: "broken-wall",
      target: "supply-crates"
    })
  });

  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.outcome.resolved, true);
  assert.equal(payload.outcome.replay.gameType, "sniper");
  assert.equal(payload.outcome.replay.hitByA, true);
  assert.equal(payload.outcome.replay.hitByB, false);
  assert.equal(payload.outcome.replay.turnAId, turnAId);
  assert.equal(payload.outcome.replay.turnBId, turnBId);
  assert.equal(payload.resultEmail.sent, true);
  assert.equal(payload.resultEmail.actor, "A");
  assert.equal(payload.resultEmail.gameType, "sniper");
  assert.equal(payload.next.actor, "A");
  assert.equal(payload.next.email.sent, true);

  const submittedPatch = requests.find(request => request.target.includes("/match_turns?") && request.method === "PATCH" && request.body.status === "submitted");
  assert.deepEqual(JSON.parse(submittedPatch.body.move), { emergence: "broken-wall", target: "supply-crates" });

  const gmailRequests = requests.filter(request => request.target.includes("gmail.googleapis.com/gmail/v1/users/me/messages/send"));
  assert.equal(gmailRequests.length, 2);
  const messages = gmailRequests.map(request => expandMime(Buffer.from(request.body.raw, "base64url").toString("utf8")));
  assert.ok(messages.some(message => /To: a@example\.com/.test(message) && /Watch the round/.test(message)));
  assert.ok(messages.some(message => /To: a@example\.com/.test(message) && /Play your turn/.test(message)));
});

function expandMime(mime) {
  const decodedParts = [];
  const pattern = /Content-Transfer-Encoding: base64\r?\n\r?\n([A-Za-z0-9+/=\r\n]+?)(?=\r?\n--)/g;
  for (const match of mime.matchAll(pattern)) decodedParts.push(Buffer.from(match[1].replace(/\s+/g, ""), "base64").toString("utf8"));
  return `${mime}\n${decodedParts.join("\n")}`;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
