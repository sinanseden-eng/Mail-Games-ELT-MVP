# Mail Games ELT 0.9H1 — Deployment and Dual-Perspective Test

## What changed

Penalty Shootout now shows one resolved kick from the correct player's viewpoint:

- the striker's signed result link opens in **Penalty Taker View**;
- the keeper's immediate result opens in **Goalkeeper View**;
- the ball travels quickly to the stored shot coordinate while the keeper commits to the stored dive coordinate;
- all six zones are visually mirrored for the keeper without changing the canonical stored event;
- the floating miniature net, moving pointer and dashed deflection guide are removed;
- goal, save, miss, post and crossbar outcomes are shown on the main scene;
- replay-again preserves the viewer's role;
- canvas accessibility labels and synthesized audio adapt to the perspective.

Scoring, questions, signed-link security, Gmail delivery, Supabase tables, Turkey Fight and Sniper remain unchanged.

## Deploy

1. Keep the working 0.9H ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9h1.zip`.
3. Replace the deployed project with the complete extracted folder.
4. Wait for Netlify to report **Published**.
5. Hard-refresh with `Ctrl + F5`.

No SQL migration is required. No new Netlify environment variable is required.

## Required live test

### Striker view

1. Resolve a penalty and open the signed replay email sent to the striker.
2. Confirm the label reads **PENALTY TAKER VIEW**.
3. Confirm the ball itself quickly reaches the selected part of the goal.
4. Confirm there is no detached mini-net, pointer or dashed trajectory guide.
5. Press replay and confirm the same view, coordinate and outcome return.

### Keeper view

1. Submit the defending player's answer and dive.
2. Confirm the immediate replay reads **GOALKEEPER VIEW**.
3. Confirm the striker is seen from the goal-line side and the incoming ball grows toward the target.
4. Confirm the camera/gloves move toward the keeper's stored dive direction.
5. For a save, confirm glove contact and deflection are visible.
6. For a goal, confirm the ball passes the keeper and reaches the correct net area.

### Coverage

Test all six shot zones and at least:

- one wrong-way goal;
- one correct-zone save;
- one miss;
- one post or crossbar outcome;
- desktop and mobile layouts;
- reduced-motion mode;
- sound muted and unmuted;
- the same replay twice.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 145 passed, 0 failed

A live Netlify/browser test is still required for final camera timing, audio balance, asset loading and mobile cropping.
