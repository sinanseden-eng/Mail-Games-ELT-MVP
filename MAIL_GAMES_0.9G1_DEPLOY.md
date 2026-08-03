# Mail Games ELT 0.9G1 — Deployment and Visual Test

## What changed

Penalty Shootout now gives every one of the six realistic goal coordinates a distinct ball path, goalkeeper response and impact effect. The final result stays on the selected location.

No SQL migration or new Netlify environment variable is required.

## Deploy

1. Keep the working 0.9G ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9g1.zip`.
3. Replace the deployed project with the complete extracted folder.
4. Wait for Netlify to show **Published**.
5. Hard-refresh with `Ctrl + F5`.

## Visual test

Create fresh penalties and verify:

1. Top left and top right rise and bend toward opposite corners.
2. Top centre rises higher than bottom centre.
3. Bottom left and bottom right stay lower and travel toward opposite lower corners.
4. A save displays a keeper reaction and glove contact at the selected coordinate.
5. Goals ripple the selected upper, lower, side or central net area.
6. Misses vary between bar, over, wide and scuffed-wide presentations.
7. The final realistic frame keeps the selected impact location.
8. Repeat one test on a mobile browser.

Penalty scoring, Gmail turns, signed replay links, Supabase data, Turkey Fight and Sniper are unchanged.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 122 passed, 0 failed
- A six-panel path preview is included at `docs/penalty-zone-path-preview-0.9g1.jpg`.

A live Netlify visual test is still required because final image cropping and mobile scaling depend on the deployed viewport.
