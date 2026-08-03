# Mail Games ELT 0.7.3 — Deployment and Test Guide

## What this version adds

- Cinematic ready, strike, impact and result timing
- Optional sound on the standalone shootout, live email turn and signed replay pages
- Browser-synthesized whistle, boot, glove, net and crowd cues
- A required **Play penalty** click on emailed replay pages so browsers can unlock sound correctly
- Separate GOAL, SAVED and MISSED banners
- Goal/save/miss celebration particles and character reactions
- Existing 2.5D scene, ball physics, grounded keeper, sagging net, Gmail delivery and server scoring preserved

## Deployment

1. Extract `mailgames-elt-mvp-0.7.3.zip`.
2. Open the extracted `mailgames-elt-mvp-0.7.3` folder.
3. Replace the files in the GitHub repository with the files inside that folder.
4. Commit the changes to the branch Netlify deploys.
5. Wait for Netlify to report **Published**.
6. Open the site and press **Ctrl + F5** once.

No Supabase migration is required.

No new Netlify environment variable is required.

Do not delete the existing Gmail, Supabase, token-secret, test-code or recipient-allowlist variables.

## Focused acceptance test

### Standalone shootout

1. Open `/shootout.html`.
2. Confirm the top bar shows **Sound on**.
3. Complete one goal, one save and one miss.
4. Check that each outcome has a different result banner, sound and particle treatment.
5. Toggle **Sound off**, replay a kick, and confirm it remains silent.
6. Enable reduced motion and confirm the replay becomes shorter with fewer particles.

### Email match

1. Create a completely new penalty match from Teacher Studio.
2. Complete Player A's striker turn.
3. Complete Player B's goalkeeper turn.
4. Confirm the goalkeeper sees the result immediately with sound after submitting.
5. Open the striker's result email.
6. Confirm the replay page waits at a **Play penalty** button.
7. Press the button and confirm the animation and sound start together.
8. Use **Replay animation** and confirm the stored result does not change.

## Expected health endpoint

The backend health result is unchanged and should still contain:

```json
"emailProvider": "gmail",
"gmailConfigured": true
```

## Validation performed

- JavaScript syntax validation passed.
- 55 automated tests passed.
- Backend email, signed-turn and signed-replay tests remained green.
- Physics, grounded-keeper, net-stability and 2.5D scene smoke tests remained green.
- New audio cue, replay-gesture, timing and celebration tests passed.
