# Penalty Motion Realism — 0.9H3

## Purpose

0.9H3 polishes the movement introduced by the natural keeper replay. It does not change scoring, stored coordinates, email turns, replay tokens or database state.

## Motion changes

- The ball leaves the boot with a decisive ease-out flight profile and still lands exactly on the canonical shot coordinate.
- The goalkeeper now has separate anticipation, launch, extension and landing phases.
- Striker and keeper photo sequences use short motion-matched transitions. The dominant frame stays clear instead of two full frames remaining equally visible.
- Fast ball movement uses a brief ball-attached blur only. There is no pointer, detached trail or target graphic.
- Saves use subtle ball compression at glove contact.
- Goals use a restrained ripple drawn into the existing full-size goal net.

## Architecture

All changes are presentation-only in `penalty-visuals.mjs`. The replay snapshot remains canonical and role-neutral. Existing striker and keeper perspective rules are preserved.

## Files changed

- `penalty-visuals.mjs`
- `turn.html`
- `replay.html`
- `shootout.html`
- `turn.js`
- `replay.js`
- `shootout.js`
- `shootout-scene.mjs`
- `package.json`
- `README.md`
- `tests/penalty-motion-realism-0.9h3.test.mjs`

## Deployment

No Supabase migration and no new Netlify environment variable are required. Deploy with cache cleared because browser module version strings change from `0.9.21` to `0.9.22`.
