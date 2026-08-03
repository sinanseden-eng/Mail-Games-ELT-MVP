# Mail Games ELT 0.9H4 — Single-Angle Six-Zone Replay

## What changed

- Removed striker/keeper camera switching from the active penalty replay.
- Reused one fixed photographic stadium angle for all participants.
- Added six penalty-taker movement profiles.
- Added six independent goalkeeper movement profiles.
- Added natural ball acceleration, spin, shrinking perspective, shadow, save deflection, miss continuation and localized net response.
- Removed active POV labels and replaced them with **PENALTY REPLAY · MAIN CAMERA**.
- Preserved server scoring, signed links, Gmail delivery and Supabase data.

## Deployment

1. Extract the complete ZIP, or apply the 0.9H3 → 0.9H4 patch at the repository root.
2. Replace matching files and keep the new `assets/penalty-single-angle/` directory.
3. Commit and push to GitHub.
4. In Netlify, use **Clear cache and deploy site**.
5. Hard-refresh the turn and replay pages.

No Supabase migration or new environment variable is required.

## Live test matrix

Test all six shot choices against all six goalkeeper choices. At minimum verify:

- wrong-way goal: top-left shot / bottom-right dive;
- correct-zone save: bottom-left shot / bottom-left dive;
- high-centre shot / high-centre jump;
- low-centre shot / low-centre block;
- one wide miss and one bar/crossbar miss;
- replay-again uses exactly the same angle and coordinates;
- desktop and mobile framing;
- sound and reduced-motion mode.

The ball and goalkeeper should move simultaneously in the same goalmouth. No camera cut, mini net, pointer or separate result illustration should appear.
