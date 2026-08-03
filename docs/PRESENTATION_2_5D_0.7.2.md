# Mail Games ELT 0.7.2 — 2.5D Presentation Upgrade

## Purpose

This milestone improves the visual depth of the shared penalty scene without touching the working email, database or scoring infrastructure.

## Visual changes

- Layered stadium, crowd, floodlights and richer turf
- Goal interior planes and stronger post depth
- Translucent volumetric net surfaces over the existing physical cord simulation
- 2.5D striker and goalkeeper constructed from overlapping shaded components
- Direction-aware goalkeeper limb depth during dives
- Improved football volume, panels, seams and specular lighting
- Pitch-anchored contact shadows retained from the 0.7.1a landing hotfix

## Unchanged systems

- Supabase schema
- Gmail OAuth and Netlify environment variables
- Signed turn and replay tokens
- Server-authoritative goal/save/miss outcome logic
- Existing ball trajectories and net physics

## Acceptance checks

1. Open `shootout.html` and inspect idle striker/goalkeeper depth.
2. Test a high left and high right save to verify limb ordering and grounding.
3. Test a low-corner goal and a top-corner goal to inspect net depth.
4. Open an emailed turn and replay link to confirm the same shared scene appears.
5. Check a narrow mobile viewport for scene cropping or unreadable controls.
