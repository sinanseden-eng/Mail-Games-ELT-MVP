import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://project-status.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy.jwt.key";
delete process.env.SUPABASE_SECRET_KEY;
process.env.TURN_TOKEN_SECRET = "another-secure-test-secret-with-32-characters";
process.env.SITE_URL = "https://mail-games.example";
process.env.MAILGAMES_TEST_CODE = "private-test-code-123";

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const method = options.method || "GET";
  const table = new URL(target).pathname.split("/").at(-1);
  if (table === "matches" && method === "GET") {
    return response([{
      id: "33333333-3333-4333-8333-333333333333",
      game_type: "penalty",
      status: "active",
      player_a_name: "A",
      player_a_email: "a@example.com",
      player_b_name: "B",
      player_b_email: "b@example.com",
      state: { kickIndex: 0, phase: "striker" },
      expires_at: "2027-08-15T00:00:00.000Z"
    }]);
  }
  if (table === "match_turns" && method === "GET") {
    return response([{
      id: "44444444-4444-4444-8444-444444444444",
      actor: "A",
      role: "striker",
      status: "pending",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      delivery_status: "failed",
      delivery_provider_id: null,
      delivery_error: "Domain is not verified",
      delivery_recipient_masked: "a•@example.com",
      delivery_attempted_at: new Date().toISOString()
    }]);
  }
  return response({ message: `Unexpected ${method} ${target}` }, 500);
};

const { handler } = await import("../netlify/functions/test-match-status.mjs");
test.after(() => { globalThis.fetch = realFetch; });

test("teacher recovery returns masked delivery status and a fresh pending link", async () => {
  const result = await handler({
    httpMethod: "POST",
    headers: { "x-mailgames-test-code": "private-test-code-123" },
    body: JSON.stringify({ matchId: "33333333-3333-4333-8333-333333333333" })
  });
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.pending.delivery.status, "failed");
  assert.equal(payload.pending.recipient.email, "a••@example.com");
  assert.match(payload.pending.recoveryTurnUrl, /^https:\/\/mail-games\.example\/turn\.html\?token=/);
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
