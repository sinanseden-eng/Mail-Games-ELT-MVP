import assert from "node:assert/strict";
import test from "node:test";

const realFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const { emailProviderStatus, sendEmailMessage } = await import("../netlify/functions/_shared/email.mjs");

test.afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test("Gmail is preferred automatically when complete OAuth variables exist", () => {
  setGmailEnv();
  process.env.RESEND_API_KEY = "resend-key";
  process.env.MAILGAMES_FROM_EMAIL = "Mail Games <play@example.com>";
  delete process.env.MAILGAMES_EMAIL_PROVIDER;
  const status = emailProviderStatus();
  assert.equal(status.configured, true);
  assert.equal(status.provider, "gmail");
  assert.equal(status.gmailConfigured, true);
  assert.equal(status.resendConfigured, true);
});

test("explicit Gmail selection fails closed when its refresh token is missing", () => {
  setGmailEnv();
  delete process.env.GMAIL_REFRESH_TOKEN;
  process.env.RESEND_API_KEY = "resend-key";
  process.env.MAILGAMES_FROM_EMAIL = "Mail Games <play@example.com>";
  process.env.MAILGAMES_EMAIL_PROVIDER = "gmail";
  const status = emailProviderStatus();
  assert.equal(status.configured, false);
  assert.equal(status.provider, "missing");
});

test("Gmail token errors are returned without attempting a message send", async () => {
  setGmailEnv();
  process.env.MAILGAMES_EMAIL_PROVIDER = "gmail";
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return response({ error: "invalid_grant", error_description: "Token has expired or been revoked" }, 400);
  };
  const result = await sendEmailMessage({
    to: "student@example.com",
    subject: "Your turn",
    text: "Open your turn",
    html: "<p>Open your turn</p>"
  });
  assert.equal(result.sent, false);
  assert.equal(result.provider, "gmail");
  assert.match(result.reason, /expired or been revoked/);
  assert.deepEqual(calls, ["https://oauth2.googleapis.com/token"]);
});

test("Resend remains available as an explicit fallback", async () => {
  clearGmailEnv();
  process.env.MAILGAMES_EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "resend-key";
  process.env.MAILGAMES_FROM_EMAIL = "Mail Games <play@example.com>";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer resend-key");
    return response({ id: "resend-message-1" });
  };
  const result = await sendEmailMessage({
    to: "student@example.com",
    subject: "Your turn",
    text: "Open your turn",
    html: "<p>Open your turn</p>",
    idempotencyKey: "turn-123"
  });
  assert.deepEqual(result, { sent: true, id: "resend-message-1", provider: "resend" });
});

function setGmailEnv() {
  process.env.GMAIL_CLIENT_ID = "client-id";
  process.env.GMAIL_CLIENT_SECRET = "client-secret";
  process.env.GMAIL_REFRESH_TOKEN = "refresh-token";
  process.env.GMAIL_SENDER_EMAIL = "teacher@gmail.com";
  process.env.MAILGAMES_SENDER_NAME = "Mail Games ELT";
}

function clearGmailEnv() {
  delete process.env.GMAIL_CLIENT_ID;
  delete process.env.GMAIL_CLIENT_SECRET;
  delete process.env.GMAIL_REFRESH_TOKEN;
  delete process.env.GMAIL_SENDER_EMAIL;
  delete process.env.MAILGAMES_SENDER_NAME;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
