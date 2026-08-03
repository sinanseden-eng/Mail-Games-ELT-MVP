# Shootout 0.5D — camera restoration, keeper anchoring and net sag

This milestone responds to the deployed 0.5C visual review. It preserves the working question, scoring, secret-zone and match-progression logic.

## Camera restoration

The camera moves laterally toward the near-right side of the goal and closer to the scene. The near post is now more dominant, the crossbar has a stronger diagonal, and the roof and right-side panels are easier to read. The striker and ball are reblocked to remain inside the frame while preserving a meaningful shooting corridor.

## Goalkeeper anchoring

Earlier builds treated the goalkeeper's world projection as the character's torso origin, causing the feet to appear well in front of the goal line. Version 0.5D treats the projected world point as the goalkeeper's foot contact point and offsets the drawing origin upward. The keeper now stands on the goal line and begins dives from that anchored position.

## Resting net sag

The four net panels now use different rest shapes:

- rear net: deeper central pocket and mild lower-edge looseness;
- roof net: stronger curved droop;
- near and far side nets: visible inward bow and vertical sag.

The physical solver uses slightly lower shape-restoration force, less velocity damping and stronger gravity. Impact impulses are larger and replay time is longer, allowing a visible secondary recoil before the net returns to its naturally sagging rest shape.

## Files changed

- `shootout-net.mjs`
- `shootout.js`
- `shootout.html`
- `shootout-core.mjs`
- `tests/shootout-net.test.mjs`
- `README.md`
- `package.json`

## Validation

```bash
npm run check
npm test
```
