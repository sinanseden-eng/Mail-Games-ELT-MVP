# Mail Games ELT 0.8e — Cinematic barn arena upgrade

## What changed

Version 0.8e upgrades Turkey Fight Mail visually while preserving the proven email-turn, Gmail and replay system.

### Included
- custom barn-photo arena background from `assets/turkey-barn-background.jpg`;
- photo-aware canvas rendering with warm sunset grading;
- 2.5D foreground depth using drifting dust and grass occlusion;
- longer fighter shadows and a clearer central fight zone;
- updated 0.8e version labels in turn and replay pages.

## Files touched
- `turkey-scene.mjs`
- `turn.html`
- `replay.html`
- `package.json`
- `README.md`
- `assets/turkey-barn-background.jpg`

## Deployment
1. Replace the repository contents with the 0.8e package.
2. Commit and push to GitHub.
3. Trigger a Netlify redeploy.
4. Open a Turkey Fight turn and verify the barn arena loads behind both fighters.

## Visual acceptance
- the barn remains visible behind the combat zone;
- the fighters read clearly against the photo;
- foreground grass partially overlaps the feet;
- dust and sunset overlays are subtle, not distracting;
- fight turns, replay emails and secure links still behave as before.
