# Mail Games ELT 0.9E1 — Penalty kick-and-goal hotfix

## Fault corrected

The 0.9E full-motion replay called an easing helper that did not exist inside `shootout-scene.mjs`. As soon as the behind-the-ball phase began, the render loop threw a runtime error. This stopped the replay immediately before the striker should have contacted the ball, so the subsequent ball flight and goal-net animation never appeared.

## Changes

- Replaced the invalid easing call with the scene's existing easing function.
- Restored the stable 0.9D pitch, striker, goalkeeper and net as the uninterrupted base layer.
- Cinematic overlays can no longer crop away or replace the working kick and goal animation.
- The behind-the-ball view renders an explicit close-up football at the contact point.
- Extended the visible leg swing and follow-through.
- Removed three unused `shootout.js` constants that referenced an unimported layout object and could stop the standalone prototype.
- Added a full-motion smoke test at wind-up, contact, flight, goal-plane and result frames.

No scoring, email, Supabase or Sniper/Turkey behavior was changed.
