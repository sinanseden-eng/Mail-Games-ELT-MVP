import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.TURN_TOKEN_SECRET;
  if (!value || value.length < 32) {
    const error = new Error("TURN_TOKEN_SECRET must contain at least 32 characters");
    error.statusCode = 503;
    throw error;
  }
  return value;
}

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload) {
  return createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

function createSignedToken(claims, lifetimeSeconds) {
  const payload = {
    ...claims,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function verifySignedToken(token, expiredMessage) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) unauthorized();

  const expected = Buffer.from(sign(encoded));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) unauthorized();

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    unauthorized();
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error(expiredMessage);
    error.statusCode = 410;
    throw error;
  }
  return payload;
}

export function createTurnToken(claims, lifetimeSeconds = 48 * 60 * 60) {
  return createSignedToken({ ...claims, tokenType: "turn" }, lifetimeSeconds);
}

export function verifyTurnToken(token) {
  const payload = verifySignedToken(token, "This turn link has expired");
  // Pre-0.7 links did not include tokenType, so keep them valid during rollout.
  if (payload.tokenType && payload.tokenType !== "turn") unauthorized();
  return payload;
}

export function createReplayToken(claims, lifetimeSeconds = 30 * 24 * 60 * 60) {
  return createSignedToken({ ...claims, tokenType: "replay" }, lifetimeSeconds);
}

export function verifyReplayToken(token) {
  const payload = verifySignedToken(token, "This replay link has expired");
  if (payload.tokenType !== "replay") unauthorized();
  return payload;
}

function unauthorized() {
  const error = new Error("Invalid secure link");
  error.statusCode = 401;
  throw error;
}
