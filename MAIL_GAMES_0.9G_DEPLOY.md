# Mail Games ELT 0.9G — Deployment and Visual Test

## What changed

Penalty Shootout now uses the realistic striker-and-goalkeeper scene from the beginning of a turn. The six shot/dive coordinates are positioned over its photographed goal mouth. Resolved replays and final result screens remain realistic instead of revealing the former cartoon renderer.

The game rules, emails, signed links, scores, Supabase tables and Netlify variables are unchanged.

## Deploy

1. Keep the working 0.9F2 ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9g.zip`.
3. Replace the deployed project with the complete extracted folder.
4. Wait for Netlify to report **Published**.
5. Hard-refresh the site with `Ctrl + F5`.

No SQL migration is required.

## Visual test

1. Open a fresh Penalty Shootout striker turn.
2. Confirm the first scene already shows the realistic striker, ball, goalkeeper and goal.
3. Answer the question and confirm the six circular coordinates appear over the photographed goal mouth.
4. Choose a coordinate and confirm a yellow trajectory guide points to that exact area.
5. Complete the goalkeeper turn and watch the replay.
6. Confirm no cartoon striker, goalkeeper, pitch or goal appears before, during or after the replay.
7. Repeat with one goal, one save and one inactive-shot miss.
8. Test one mobile browser after the desktop check.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 114 passed, 0 failed

A live Netlify visual test is still required because final browser cropping and mobile scaling depend on the deployed viewport.
