import { json, methodNotAllowed } from "./_shared/http.mjs";
import { emailProviderStatus } from "./_shared/email.mjs";
import { allowedRecipientList } from "./_shared/test-access.mjs";
import { supabaseKeyMode } from "./_shared/supabase.mjs";

export async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed(["GET"]);
  const siteUrl = Boolean(process.env.SITE_URL || process.env.URL);
  const databaseKeyMode = supabaseKeyMode();
  const allowedRecipients = allowedRecipientList();
  const email = emailProviderStatus();
  return json(200, {
    ok: true,
    service: "Mail Games ELT Mission Control",
    mode: "protected-email-test",
    configured: {
      siteUrl,
      supabase: Boolean(process.env.SUPABASE_URL && databaseKeyMode !== "missing"),
      turnTokens: Boolean(process.env.TURN_TOKEN_SECRET && process.env.TURN_TOKEN_SECRET.length >= 32),
      email: email.configured,
      launchProtection: Boolean(process.env.MAILGAMES_TEST_CODE && process.env.MAILGAMES_TEST_CODE.length >= 12),
      recipientAllowlist: allowedRecipients.length >= 1
    },
    details: {
      databaseKeyMode,
      allowedRecipientCount: allowedRecipients.length,
      emailProvider: email.provider,
      emailProviderRequested: email.requested,
      gmailConfigured: email.gmailConfigured,
      resendConfigured: email.resendConfigured
    }
  });
}
