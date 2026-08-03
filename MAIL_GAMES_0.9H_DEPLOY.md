# Mail Games ELT 0.9H — Deployment and Visual Test

## What changed

Penalty Shootout keeps the 0.9G2 full-realistic scene and adds animation polish: blended striker and goalkeeper frames, boot-contact response, ball spin and shadow, glove deflection, elastic net movement, rebounds and zone-aware audio.

The game rules, emails, signed links, scores, Supabase tables and Netlify variables are unchanged.

## Deploy

1. Keep the working 0.9G2 ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9h.zip`.
3. Replace the deployed project with the complete extracted folder.
4. Wait for Netlify to report **Published**.
5. Hard-refresh with `Ctrl + F5`.

No SQL migration is required.

## Visual test

1. Play a bottom-corner goal and confirm the ball has spin, changing size and a visible pitch shadow.
2. Play a top-corner goal and confirm its higher flight and localized upper-net ripple.
3. Play one save and confirm the keeper moves through ready/dive frames before glove contact and deflection.
4. Play top-left or top-right as a miss and confirm a bar flash, metallic sound and visible rebound.
5. Play a low wide miss and confirm the ball continues outside the goal rather than returning to a generic position.
6. Replay the same result twice and confirm the stored coordinate and outcome remain identical.
7. Test one desktop and one mobile browser.
8. Turn on **Reduce motion** and confirm the result remains readable.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 135 passed, 0 failed

A live Netlify test is still required for final visual timing, audio balance and mobile cropping.
