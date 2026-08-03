# Mail Games ELT 0.8e1 — Penalty scene routing hotfix

## Fixed
When a Penalty Shootout turn or replay was opened, the Turkey Fight fallback layer could remain visible above the football canvas.

## Solution
- `turn.js` and `replay.js` now explicitly hide `#turkey-scene-fallback` in penalty mode.
- `turkey.css` includes a failsafe rule that hides the fallback whenever `.turkey-scene` is not active.
- No database, Gmail, question, scoring, or game-engine behavior changed.
