# Mail Games ELT 0.7.1 — ball physics and sagging-net polish

## Purpose

0.7 proved the secure email-turn and replay flow. 0.7.1 keeps that infrastructure unchanged and replaces the earlier Bézier-like replay movement with a deterministic, physically inspired presentation layer.

The server remains authoritative. It stores `goal`, `save` or `miss`; the browser reproduces that immutable result and never recalculates the score.

## Ball model

- Every replay receives a deterministic seed derived from kick index, shot zone, keeper zone, outcome and reason.
- High zones use a larger launch arc and late dip; low zones stay closer to the turf.
- Side zones receive a small spin curve that returns to the exact calibrated goal-plane contact.
- Ball size comes from camera depth rather than a hand-written start/end scale.
- Rotation follows travel and slows after net impact.
- Fast phases use a short motion trail and a projected ground shadow.

## Outcome presentation

### Goal

The ball reaches the calibrated front-plane contact, travels into the correct roof/side/rear pocket, compresses the net, oscillates briefly and settles downward inside the goal.

### Save

The goalkeeper reaches the stored zone at the contact time. The ball then follows a gravity-driven deflection back toward the pitch, including a low bounce when it reaches the grass.

### Miss

The six zones map to deterministic wide or over-bar trajectories. The ball continues beyond the frame instead of stopping or vanishing at the goal line.

## Net model

- Stronger natural sag on roof, rear and side panels
- Four high-quality simulation substeps while the net is energetic, fewer while idle
- Localized impact impulse shaped by incoming ball direction
- Delayed wider impulse for a visible secondary ripple
- Gravity, damping, shape restoration and world bounds
- Floor collision prevents lower net nodes from falling below the pitch
- Slower return to rest for a heavier cloth impression

## Files

- `shootout-physics.mjs` — deterministic shot, save, miss, scale and keeper-motion sampling
- `shootout-net.mjs` — sagging volumetric net and delayed impact ripples
- `shootout-scene.mjs` — shared rendering used by local play, secure turns and result replays
- `tests/shootout-physics.test.mjs` — trajectory, contact, deflection, miss, perspective and keeper tests
- `tests/shootout-net.test.mjs` — sag, stability, secondary ripple and settling tests

## Deployment

No Supabase migration or environment-variable change is required. Replace the deployed 0.7 files with the complete 0.7.1 package and trigger a Netlify deployment. Create a fresh match for acceptance testing.
