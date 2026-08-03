export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    },
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}

export function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    const error = new Error("Invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

export function methodNotAllowed(allowed) {
  return json(405, { error: "Method not allowed" }, { Allow: allowed.join(", ") });
}

export function safeText(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizeAnswer(value) {
  return safeText(value, 500)
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

export function publicError(error) {
  const statusCode = Number(error?.statusCode) || 500;
  const message = statusCode === 503 ? error.message : statusCode >= 500 ? "Server error" : error.message;
  if (statusCode >= 500) console.error(error);
  return json(statusCode, { error: message });
}
