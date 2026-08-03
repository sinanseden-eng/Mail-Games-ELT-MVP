# Shootout 0.5E — ball target calibration and corner accuracy

This milestone corrects the visual impact locations without changing the deterministic game rules.

## Goal-mouth contacts

The six logical zones now use aggressive contact coordinates close to the frame. `goalTargetWorld()` applies a size-five ball-radius clearance so the rendered ball remains fully inside the post and crossbar rather than clipping through them.

## Net pockets

`goalPocketWorld()` separates the front-plane contact from the deeper destination inside the net cage:

- top corners continue into the roof/side junction;
- low corners continue into the lower side/back pocket;
- top centre continues under the roof net;
- low centre continues deep into the rear net.

The ball reaches the contact first, then sinks completely toward the pocket. Net impulses use side, roof and rear panels with different weights according to the selected zone.

## Calibration overlay

The **Show targets** toolbar button displays:

- yellow circles: goal-mouth contacts;
- turquoise circles: deeper net pockets;
- dashed lines: follow-through vectors.

The overlay is a prototype diagnostic and does not affect scoring.

## Replay timing

The physical net impulse now begins at the moment the replayed ball reaches the goal plane instead of starting early.

## Files changed

- `shootout-core.mjs` — calibrated six-zone coordinates and new storage version
- `shootout-net.mjs` — ball-radius contact clearance, pocket targets and panel weights
- `shootout.js` — pocket follow-through, target guide and impact timing
- `shootout.html` — calibration control and 0.5E notes
- `tests/shootout-net.test.mjs` — corner, clearance and pocket tests

## Validation

```bash
npm run check
npm test
```
