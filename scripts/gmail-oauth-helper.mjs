import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const clientId = process.env.GMAIL_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
const redirectUri = "http://127.0.0.1:53682/oauth2callback";
const scope = "https://www.googleapis.com/auth/gmail.send";

if (!clientId || !clientSecret) {
  console.error(`\nSet these temporary Command Prompt variables first:\n\nset "GMAIL_CLIENT_ID=your-client-id"\nset "GMAIL_CLIENT_SECRET=your-client-secret"\nnode scripts\\gmail-oauth-helper.mjs\n`);
  process.exit(1);
}

const state = randomBytes(24).toString("hex");
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope,
  access_type: "offline",
  prompt: "consent",
  include_granted_scopes: "true",
  state
}).toString();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", redirectUri);
  if (url.pathname !== "/oauth2callback") {
    response.writeHead(404).end("Not found");
    return;
  }
  if (url.searchParams.get("state") !== state) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("State mismatch. Close this tab and run the helper again.");
    server.close();
    return;
  }
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  if (!code) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(`Google authorization failed: ${oauthError || "No code returned"}`);
    server.close();
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokens.error_description || tokens.error || "Token exchange failed");

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(`
      <h1>Mail Games Gmail authorization completed</h1>
      <p>You may close this tab and return to Command Prompt.</p>`);

    console.log("\nAuthorization completed. Add these values to Netlify:\n");
    console.log(`MAILGAMES_EMAIL_PROVIDER=gmail`);
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    if (tokens.refresh_token) {
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    } else {
      console.log("GMAIL_REFRESH_TOKEN was not returned. Remove the app from your Google Account permissions, then run this helper again.");
    }
    console.log("GMAIL_SENDER_EMAIL=the Gmail address you just authorized");
    console.log("MAILGAMES_SENDER_NAME=Mail Games ELT\n");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Token exchange failed. Check Command Prompt.");
    console.error(`\nOAuth error: ${error.message}\n`);
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

server.listen(53682, "127.0.0.1", () => {
  console.log(`\nWaiting for Google authorization at ${redirectUri}`);
  console.log("A browser window should open. If it does not, open this URL manually:\n");
  console.log(`${authUrl}\n`);
  openBrowser(String(authUrl));
});

function openBrowser(url) {
  // Avoid `cmd /c start` on Windows: ampersands in OAuth query strings can
  // be interpreted as command separators and truncate the authorization URL.
  const command = process.platform === "win32"
    ? "rundll32.exe"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["url.dll,FileProtocolHandler", url]
    : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
