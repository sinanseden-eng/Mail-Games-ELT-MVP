function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const error = new Error("Supabase is not configured");
    error.statusCode = 503;
    throw error;
  }
  return { url, key, modernSecret: key.startsWith("sb_secret_") };
}

export async function db(table, {
  method = "GET",
  query = "",
  body,
  prefer = "return=representation"
} = {}) {
  const { url, key, modernSecret } = config();
  const headers = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: prefer
  };
  // Legacy service_role keys are JWTs and work as Bearer tokens. The newer
  // sb_secret_ keys are opaque and should be sent only as the apikey header.
  if (!modernSecret) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ""}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = text || null; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || `Database request failed (${response.status})`);
    error.statusCode = response.status === 404 ? 404 : 500;
    error.details = data;
    throw error;
  }
  return data;
}

export function eq(value) {
  return encodeURIComponent(String(value));
}

export function supabaseKeyMode() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key) return "legacy-service-role";
  return "missing";
}
