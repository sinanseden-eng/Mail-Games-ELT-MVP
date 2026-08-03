# Mail Games ELT 0.6G — Gmail API setup

This milestone sends turn emails from one Gmail account through the official Gmail API. It avoids Resend's verified-domain requirement and keeps Supabase, signed turn links, delivery logging, and recovery links unchanged.

## What you will create

- One Google Cloud project
- Gmail API enabled for that project
- One OAuth 2.0 web client
- One refresh token for the Gmail account that sends Mail Games messages
- Six Gmail-related Netlify environment variables

Use a dedicated Gmail account for Mail Games when possible rather than a personal inbox used for sensitive correspondence.

## 1. Enable Gmail API

1. Open Google Cloud Console.
2. Create or select a project named **Mail Games ELT**.
3. Open **APIs & Services → Library**.
4. Search for **Gmail API** and click **Enable**.

## 2. Configure Google Auth Platform

1. Open **Google Auth Platform** in the same project.
2. Complete **Branding** with the app name `Mail Games ELT` and your contact email.
3. Under **Audience**, choose **External** and keep the publishing status at **Testing** for the first prototype.
4. Add the Gmail account that will send the messages as a **Test user**.
5. Under **Data Access**, add only this scope:

```text
https://www.googleapis.com/auth/gmail.send
```

The app does not request inbox-reading or message-deletion access.

## 3. Create the OAuth client

1. Open **APIs & Services → Credentials**.
2. Choose **Create credentials → OAuth client ID**.
3. Select **Web application**.
4. Name it `Mail Games Gmail Sender`.
5. Add this exact authorized redirect URI:

```text
http://127.0.0.1:53682/oauth2callback
```

6. Create the client and copy its client ID and client secret.

## 4. Obtain the refresh token

Extract the project, open Command Prompt inside its folder, and run:

```powershell
$env:GMAIL_CLIENT_ID="paste-your-client-id"
$env:GMAIL_CLIENT_SECRET="paste-your-client-secret"
node scripts/gmail-oauth-helper.mjs
```

A Google authorization page should open. Sign in with the Gmail sender account and approve the single `gmail.send` permission. The helper receives the callback locally, exchanges the one-time code, and prints the Netlify values. It does not upload or save your credentials.

Do not paste the resulting refresh token into GitHub, screenshots, or chat.

## 5. Add Netlify environment variables

Add these variables to Netlify's Functions/Runtime environment:

```text
MAILGAMES_EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=your OAuth client ID
GMAIL_CLIENT_SECRET=your OAuth client secret
GMAIL_REFRESH_TOKEN=the refresh token printed by the helper
GMAIL_SENDER_EMAIL=the Gmail account you authorized
MAILGAMES_SENDER_NAME=Mail Games ELT
```

Mark `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN` as secret/sensitive values. The existing `MAIL_TEST_ALLOWED_RECIPIENTS` can now contain two different email addresses.

You may leave the old Resend variables in Netlify. `MAILGAMES_EMAIL_PROVIDER=gmail` makes Gmail the active provider.

## 6. Redeploy and verify

Trigger a fresh Netlify deployment, then open:

```text
https://mail-games-elt-mvp.netlify.app/.netlify/functions/health
```

Expected details include:

```json
{
  "configured": { "email": true },
  "details": {
    "emailProvider": "gmail",
    "gmailConfigured": true
  }
}
```

Create a new match using both approved addresses. Player A and Player B should now receive their own messages.

## Testing-mode token warning

For an external Google OAuth app whose publishing status remains **Testing**, Google normally expires refresh tokens after seven days. This is acceptable for the first test. Re-run the helper when the token expires. Before regular classroom use, review Google's production and verification requirements rather than treating a prototype token as permanent.

## Security notes

- The Gmail refresh token acts like a long-lived permission to send mail. Keep it only in Netlify's secret environment storage.
- The application requests the narrow `gmail.send` scope, not full mailbox access.
- Remove the app from your Google Account's third-party access page to revoke the refresh token.
- Gmail sending limits and anti-abuse controls still apply. This build is intended for small controlled tests, not bulk mailing.
