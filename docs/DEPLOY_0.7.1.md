# Deploy Mail Games ELT 0.7.1

## What stays unchanged

- Keep every existing Netlify environment variable.
- Keep the current Supabase schema.
- Do not run a migration for 0.7.1.
- Keep `MAILGAMES_EMAIL_PROVIDER=gmail`.
- Keep the working Google OAuth credentials and refresh token private.

## Upload and deploy

1. Preserve the working 0.7 repository as a stable tag or local backup.
2. Extract `mailgames-elt-mvp-0.7.1.zip`.
3. Open the extracted `mailgames-elt-mvp-0.7.1` folder.
4. Replace the repository contents with everything inside that folder.
5. Commit and push to the branch connected to Netlify.
6. Wait for Netlify to show **Published**.
7. Open the Mission Control health endpoint and confirm `emailProvider` remains `gmail` and `gmailConfigured` remains `true`.
8. Create a fresh penalty match rather than reusing a submitted turn link.

## Physics acceptance test

Test at least these three stored outcomes:

1. **Goal:** choose different active shot and keeper zones. Confirm the ball curves or rises, crosses the goal plane, enters the correct pocket, moves the net and settles inside it.
2. **Save:** choose the same active zone. Confirm the keeper reaches the contact point and the ball deflects back toward the pitch.
3. **Miss:** submit an incorrect striker answer. Confirm the ball continues wide or over the bar instead of stopping at the frame.

Also confirm:

- Player A and Player B still receive Gmail turn messages.
- The goalkeeper still watches the result immediately.
- The striker still receives the **Watch the penalty** replay email.
- Replaying the same result produces the same trajectory.
- The next-turn email still reaches the correct player.

## Rollback

Restore the saved 0.7 repository contents and redeploy. No database rollback is necessary because 0.7.1 adds no tables or columns.
