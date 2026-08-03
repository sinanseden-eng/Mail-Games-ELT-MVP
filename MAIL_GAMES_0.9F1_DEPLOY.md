# Mail Games ELT 0.9F1 — Penalty Replay-Layer Hotfix

## What this fixes

0.9F could show the new realistic visual layer together with the original canvas players and the six goal-choice boxes. This made the scene look like a video had been laid over the interactive game.

0.9F1 separates the states cleanly:

- **Question and zone selection:** original interactive pitch only; no cinematic frames.
- **Resolved replay:** realistic striker/keeper frames may play, while the old canvas actors fade out underneath.
- **Ball-flight/impact:** the proven 2D physics view returns after the photographic kick cut.
- **Result screen:** the six goal-zone buttons remain hidden.

## Deployment

1. Keep your working 0.9F ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9f1.zip`.
3. Replace the deployed project files with the extracted contents, or commit them to the connected GitHub repository.
4. Wait for Netlify to report **Published**.
5. Reload the site with **Ctrl + F5**.

No Supabase migration or new Netlify environment variable is required.

## Quick visual test

1. Open a fresh Penalty Shootout turn.
2. Confirm that the question/zone-selection screen shows only the normal interactive scene—not a photographic animation mixed with cartoon players.
3. Finish the striker and goalkeeper turns.
4. During replay, confirm that the six zone boxes disappear.
5. Confirm that the realistic run-up frames do not show the old striker or goalkeeper underneath.
6. Confirm that the ball-flight, save/net impact, and final result still complete.
7. Press **Replay animation** and confirm the same behavior.

## Verification completed

- JavaScript syntax checks passed.
- 108 automated tests passed.
- Added regression coverage for replay-overlay visibility and mixed visual layers.
