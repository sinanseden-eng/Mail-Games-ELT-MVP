# Mail Games ELT 0.9C1 — scope visibility hotfix

## Fixed

0.9C used a `destination-out` canvas mask after rendering the world. That operation erased the village, target soldier, and travelling shot inside the circular scope, leaving only an empty lens overlay.

0.9C1 replaces it with an even-odd outside mask, so the existing world remains visible through the lens. It also adds a deliberately readable in-lens firing sequence:

- target soldier or predicted empty cover remains visible;
- muzzle flash appears from the first-person rifle;
- a bright tracer travels to the crosshair;
- TAGGED or MISS appears at impact;
- the camera then cuts to the existing non-bloody reaction shot.

## Unchanged

Rules, scoring, hidden choices, health, Supabase, Gmail delivery, and other games are unchanged. No migration or environment-variable update is required.
