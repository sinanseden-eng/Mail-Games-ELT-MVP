# Mail Games ELT 0.8 — Deployment and Test Guide

## What this release adds

Version 0.8 connects Turkey Fight Mail to the existing protected Gmail/Supabase match system. Both fighters see the farm arena while answering, Fighter A's move stays secret, Fighter B watches the resolved fight immediately, and Fighter A receives a signed **Watch the fight** replay email.

## Deploy

1. Extract `mailgames-elt-mvp-0.8.zip`.
2. Open the extracted `mailgames-elt-mvp-0.8` folder.
3. Replace the current repository contents with everything inside that folder.
4. Commit the changes to the Netlify-connected branch.
5. Wait for Netlify to show **Published**.
6. Open the site and press **Ctrl + F5**.

No Supabase migration and no new Netlify environment variable are required.

## Create the test match

1. Open Teacher Studio.
2. Keep both recipients inside `MAIL_TEST_ALLOWED_RECIPIENTS`.
3. Select **Turkey Fight Mail**.
4. Use a small pack of at least four questions so a second round can begin.
5. Launch a completely fresh match.

## Expected flow

### Fighter A

- receives the first email;
- sees the Turkey arena while answering;
- unlocks the six moves after submitting an answer;
- chooses a move;
- sees a waiting state without a revealed result.

### Fighter B

- receives the second turn email;
- cannot see Fighter A's move or answer status;
- answers and chooses a move;
- immediately watches the exchange animation;
- sees damage and updated health.

### Result and continuation

- Fighter A receives a separate **Watch the fight** email;
- the replay reproduces the same moves, damage and health shown to Fighter B;
- the next Fighter A turn email is delivered unless the match is finished.

## Suggested test cases

1. Correct attack versus incorrect defence — full attack damage.
2. Correct attack versus its effective defence — blocked or reduced damage.
3. Incorrect attack — no attack damage.
4. Two defence moves — no direct damage.
5. Replay link opened twice — the same stored result appears both times.
6. Mobile-width test — question, move controls and arena remain usable.

## Health check

The existing endpoint should still report Gmail as configured:

```text
/.netlify/functions/health
```

Expected fields include:

```json
"emailProvider": "gmail",
"gmailConfigured": true
```

## Rollback

Keep the last accepted `0.7.3` package or Git tag. Restoring those files returns the site to the penalty-focused checkpoint without changing Supabase data or Netlify variables.
