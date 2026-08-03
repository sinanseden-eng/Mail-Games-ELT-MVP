import assert from "node:assert/strict";
import test from "node:test";

process.env.SITE_URL = "https://mail-games.example";
process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
process.env.TURN_TOKEN_SECRET = "a-health-test-secret-longer-than-thirty-two-chars";
process.env.MAILGAMES_TEST_CODE = "private-test-code-123";
process.env.MAIL_TEST_ALLOWED_RECIPIENTS = "a@example.com,b@example.com";
process.env.MAILGAMES_EMAIL_PROVIDER = "gmail";
process.env.GMAIL_CLIENT_ID = "client-id";
process.env.GMAIL_CLIENT_SECRET = "client-secret";
process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
process.env.GMAIL_SENDER_EMAIL = "teacher@gmail.com";

const { handler } = await import("../netlify/functions/health.mjs");

test("health endpoint reports Gmail as the active provider", async () => {
  const result = await handler({ httpMethod: "GET" });
  assert.equal(result.statusCode, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.configured.email, true);
  assert.equal(payload.details.emailProvider, "gmail");
  assert.equal(payload.details.gmailConfigured, true);
  assert.equal(payload.details.allowedRecipientCount, 2);
});
