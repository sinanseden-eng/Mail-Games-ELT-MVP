# MAIL GAMES 0.9H4D — BROADCAST ACCURACY PASS

## What changed
- Uses the exact centres of the six black X marks from the user's annotated broadcast screenshot.
- Uses those same coordinates for selection, ball destination, save contact, and net impact.
- Replaces the oversized procedural ball in the active replay with a photographed match-ball texture.
- Reduces the ball to broadcast-appropriate scale and keeps its shadow restrained.
- Anchors the striker by the planted foot along the pitch plane, removing the floating run-up.
- Keeps the single broadcast camera, independent shot/dive choices, and all existing game logic.

## Exact 1280×720 goal coordinates
- top-left: 184, 341
- top-centre: 300, 311
- top-right: 419, 287
- bottom-left: 189, 487
- bottom-centre: 318, 457
- bottom-right: 423, 420

## Deployment
No Supabase migration and no new Netlify environment variable are required.
Use the complete package or apply the patch over 0.9H4C, then clear the Netlify build cache and deploy.
