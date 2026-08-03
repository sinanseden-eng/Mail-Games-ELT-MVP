# Shootout 0.5C — scene reblocking and proportion fix

This milestone corrects the visual composition identified during the deployed 0.5B review. It does not change question checking, secret zone choices, deterministic scoring or volumetric net physics.

## Camera and player spacing

- The camera moves from a short prototype distance to a pulled-back penalty-distance view.
- The near-right post remains larger and lower than the far post.
- The striker now stands on a distinct foreground depth plane.
- The ball sits ahead of the striker, producing a readable run-up and longer flight.
- The goalkeeper is moved deeper into the goal cage.

## Character scale

- Striker canvas scale: 1.12, with a foreground contact shadow.
- Goalkeeper canvas scale: 1.04 at rest, with a separate goal-mouth contact shadow.
- Replay scale and dive positioning preserve the new larger silhouette.

## Pitch geometry

The two arbitrary screen-space diagonal lines have been removed. `PITCH_MARKINGS` now defines goal-line and penalty-area segments in world coordinates. The same camera that projects the goal projects these lines, so convergence and thickness remain coherent with the oblique scene.

Mowing bands are also generated from world-space ground polygons at low opacity rather than radiating from a hand-picked screen point.

## Ball corridor

The ball starts farther from goal and follows a dynamically constructed cubic Bezier path. Its control points are interpolated between start and target, avoiding the compressed curve used by the short 0.5B setup.

## Files changed

- `shootout-net.mjs` — camera, scene layout and projected pitch segments
- `shootout.js` — player positions, scales, shadows, pitch drawing and longer flight path
- `shootout.css` — 75/25 desktop balance and corrected responsive breakpoint
- `shootout.html` — 0.5C labels and explanatory notes
- `tests/shootout-net.test.mjs` — spacing and projection tests

## Validation

```bash
npm run check
npm test
```

## Deliberate limitation

The figures remain procedural placeholder cartoons. Their scale and blocking are now suitable for replacing them with the final illustrated character rigs in the next art milestone.
