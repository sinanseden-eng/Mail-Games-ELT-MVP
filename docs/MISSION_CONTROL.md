# Mission Control — backend foundation

This milestone adds the server-side contract for genuine email-to-email turns while leaving the existing local classroom demo untouched.

## What is included

- Supabase/PostgreSQL schema for question packs, questions, matches, and single-use turns
- Row Level Security enabled with no browser-readable policies
- HMAC-signed turn links with 48-hour expiry
- `create-match`, `get-turn`, and `submit-turn` Netlify Functions
- Server-side English answer checking and game resolution
- Email notification of the next player through Resend
- A standalone `/turn.html?token=...` student turn page
- A `/health` function that reports whether required services are configured without exposing secrets

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` values into Netlify environment variables.
4. Generate `TURN_TOKEN_SECRET` with at least 32 random characters.
5. Redeploy the site.
6. Visit `/.netlify/functions/health` and confirm the required services are configured.

## Create-match request

`POST /.netlify/functions/create-match`

```json
{
  "gameType": "penalty",
  "packName": "B1 Revision",
  "playerA": { "name": "Student A", "email": "a@example.com" },
  "playerB": { "name": "Student B", "email": "b@example.com" },
  "questions": [
    {
      "prompt": "She ___ here since 2023.",
      "type": "multiple-choice",
      "options": ["works", "worked", "has worked", "is working"],
      "answer": "has worked",
      "explanation": "Use the present perfect with since.",
      "level": "B1",
      "tag": "Present Perfect"
    }
  ]
}
```

The response includes a `firstTurnUrl` for testing even when an email provider is not configured. In normal use, the current player receives that link by email.

## Teacher Studio launch flow

Open `/#teacher` after deployment. The **Launch an email match** panel checks `/.netlify/functions/health`, then submits the current browser question bank to `create-match`.

Core launch requirements:

- `SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURN_TOKEN_SECRET` with at least 32 characters

Email delivery through Gmail API requires:

- `MAILGAMES_EMAIL_PROVIDER=gmail`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`

Resend remains an optional alternative using `RESEND_API_KEY` and `MAILGAMES_FROM_EMAIL`.

When email is not configured, the match is still created and the teacher receives a fallback first-turn link for controlled testing.

## Security model

- The correct answer remains inside `match_turns.correct_answer` and is never returned by `get-turn`.
- Supabase's service-role key is used only inside Netlify Functions.
- Turn links are signed, expire, and become unusable after submission.
- A partial unique index permits only one pending turn per match.
- No public database policies exist yet; teacher access will be added with Supabase Auth.

## Still to build

- Teacher authentication and ownership policies
- Class codes and student nickname roster
- Match dashboard and resend/reminder controls
- Expired-turn cleanup job
- Question analytics
- Automated integration tests against a test Supabase project
