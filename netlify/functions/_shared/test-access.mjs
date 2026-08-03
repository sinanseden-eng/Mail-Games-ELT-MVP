import { safeText } from "./http.mjs";

function testCode() {
  const code = process.env.MAILGAMES_TEST_CODE;
  if (!code || code.length < 12) {
    const error = new Error("MAILGAMES_TEST_CODE must contain at least 12 characters");
    error.statusCode = 503;
    throw error;
  }
  return code;
}

export function requireTestAccess(event) {
  const provided = safeText(event.headers?.["x-mailgames-test-code"] || event.headers?.["X-Mailgames-Test-Code"], 200);
  if (!provided || provided !== testCode()) {
    const error = new Error("The private email-test code is missing or incorrect");
    error.statusCode = 403;
    throw error;
  }
}

export function allowedRecipientList() {
  return String(process.env.MAIL_TEST_ALLOWED_RECIPIENTS || "")
    .split(",")
    .map(value => value.trim().toLocaleLowerCase("en"))
    .filter(Boolean);
}

export function requireAllowedRecipients(recipients) {
  const allowed = allowedRecipientList();
  if (!allowed.length) {
    const error = new Error("MAIL_TEST_ALLOWED_RECIPIENTS is not configured");
    error.statusCode = 503;
    throw error;
  }
  const blocked = recipients
    .map(value => String(value || "").trim().toLocaleLowerCase("en"))
    .filter(value => !allowed.includes(value));
  if (blocked.length) {
    const error = new Error("Email Test Mode only allows the approved recipient addresses");
    error.statusCode = 403;
    throw error;
  }
  return allowed;
}

export function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "hidden";
  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}
