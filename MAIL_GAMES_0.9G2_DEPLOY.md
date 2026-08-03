# Mail Games ELT 0.9G2 — Deployment and Visual Test

## What changed

Penalty Shootout now presents a true full-frame action replay rather than a static result tableau. After the realistic run-up, the camera clears the foreground striker, follows the moving ball, cuts to the goalkeeper's stored dive, and finishes on a dedicated net, glove or miss camera.

The six 0.9G1 trajectories and server-authoritative outcomes remain unchanged.

## Deploy

1. Keep the working `mailgames-elt-mvp-0.9g1.zip` as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9g2.zip`.
3. Replace the deployed project with the complete extracted folder.
4. Wait for Netlify to report **Published**.
5. Hard-refresh with **Ctrl + F5**.

No SQL migration or new Netlify environment variable is required.

## Visual test

1. Complete a bottom-right goal.
2. Confirm the sequence visibly shows:
   - run-up and boot contact;
   - the ball leaving the foreground;
   - a clean goal-facing flight camera;
   - the goalkeeper's full-screen dive;
   - the bottom-right net result.
3. Confirm no circular radar/target wheel appears at the goal impact.
4. Test one save and confirm the glove camera replaces the former keeper inset.
5. Test one miss and confirm the miss camera remains visible for the final result.
6. Replay the round and confirm the same sequence is used.
7. Check one mobile browser after the desktop test.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 127 passed, 0 failed

A live Netlify visual test is still required for final browser cropping and animation timing.
