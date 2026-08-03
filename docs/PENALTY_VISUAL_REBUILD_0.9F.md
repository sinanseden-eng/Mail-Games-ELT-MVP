# Penalty Shootout 0.9F — Visual and Animation Rebuild

0.9F upgrades the penalty replay with a generated, football-specific visual pack while retaining the stable 0.9E1 rules and physics.

## Visual pack

- Dark floodlit stadium crowd and pitch texture
- Full-screen establishing camera
- Five striker frames: set, run-up, plant, boot contact, follow-through
- Five goalkeeper frames: ready, anticipation, left/right dive, recovery
- Goal, save, and miss impact cameras

The generated stills are animated in the browser through timed frame blending, camera movement, contact flashes, and transitions. The existing programmed ball flight, goalkeeper motion, net deformation, and result logic remain visible after the cinematic kick cut.

## Stability rule

The photo-realistic layer never decides the result. It reads the server-authoritative replay payload and sits above the existing 0.9E1 renderer. If an image has not loaded, the canvas renderer continues normally.

## Database

No migration and no new environment variable are required.
