# Mail Games ELT 0.7 — cinematic email turns and result replays

## Player flow

1. The striker opens a single-use email turn link.
2. The calibrated football pitch is visible while the striker answers the English question.
3. Entering an answer unlocks six goal zones; the striker selects and submits one.
4. The striker sees a pitch-based waiting screen. The selected zone is stored server-side.
5. The goalkeeper receives a separate turn email. The striker's zone is removed from the keeper's API payload.
6. The goalkeeper answers, selects a dive and submits.
7. The server resolves the stored shot and dive, updates the score and stores a deterministic replay snapshot.
8. The goalkeeper watches the animation immediately in the same browser page.
9. The striker receives a result email containing a **Watch the penalty** button.
10. The next striker receives the next single-use gameplay email independently.

## Replay security

- Gameplay links remain single-use and expire after 48 hours.
- Result links use a separate signed token type and expire after 30 days.
- A replay token is created only after both moves exist and the penalty is resolved.
- Replay pages read the immutable result snapshot stored on the submitted goalkeeper turn.
- Opening or replaying the animation cannot change the score or create another turn.

## Deployment

0.7 requires no Supabase migration and no additional environment variables. Upload the full 0.7 folder, redeploy Netlify, and create a fresh match. Existing pending 0.6G turn links remain valid during the rollout.

## Acceptance test

- Both players see the pitch during their question and direction choice.
- The keeper cannot discover the striker's pending zone from the `get-turn` response.
- The keeper sees the correct goal/save/miss animation after submission.
- The striker receives a Gmail result email and can replay the same animation more than once.
- The next-turn email reaches the correct player.
