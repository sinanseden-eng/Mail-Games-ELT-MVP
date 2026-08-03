# Deploy Mail Games ELT 0.7

## What stays unchanged

- Keep all existing Netlify environment variables.
- Keep the current Supabase schema.
- Do not rerun a migration for 0.7.
- Keep `MAILGAMES_EMAIL_PROVIDER=gmail`.

## Upload and deploy

1. Back up the current 0.6G repository or tag it as a stable checkpoint.
2. Extract `mailgames-elt-mvp-0.7.zip`.
3. Replace the repository contents with the files inside the extracted `mailgames-elt-mvp-0.7` folder.
4. Commit and push the changes to the branch connected to Netlify.
5. Wait for Netlify to publish the new deployment.
6. Open the Mission Control health endpoint and confirm Gmail remains configured.
7. Create a fresh penalty match; do not reuse an already-submitted turn link.

## Acceptance test

1. Player A opens the first email and sees the pitch beside the English question.
2. Player A enters an answer, selects a shot zone and submits.
3. Player B receives the keeper email and sees the pitch beside the English question.
4. Player B enters an answer, chooses a dive and submits.
5. Player B watches the goal/save/miss animation immediately.
6. Player A receives a second email with **Watch the penalty**.
7. Player A opens the replay and can press **Replay animation** more than once.
8. Player B receives the next-turn email as the next striker.

## Rollback

Restore the saved 0.6G repository contents and redeploy. No database rollback is necessary because 0.7 adds no tables or columns.
