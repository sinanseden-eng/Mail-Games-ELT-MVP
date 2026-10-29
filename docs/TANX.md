# Tanx Artillery Club

`tanx.html` is a complete offline game. Double-click to play: no server, modules,
fonts, CDNs, image requests or installation. `tanx.template.html`, `tanx-core.mjs`
and `tanx-ui.js` are editable sources. `node scripts/build-tanx.mjs` regenerates
that single deliverable, including the two uploaded Meshy tank sprite bakes.

## Local play

2–4 human/CPU commanders, randomly seeded terrain, 0–180° angle and 0–100% power.
Arrow keys/A-D/W-S adjust aiming; tap Space to fire, hold Space to charge and
release to fire; P pauses. Touch has sliders, exact numbers, ± controls, Fire and
hold-to-charge. Sound is synthesized with Web Audio after explicit opt-in.
The setup includes gentle/rolling/mountain terrain, Rookie/Veteran/Elite CPU,
first to 1/2/3 round wins, wind per round/per turn/off, gravity (including zero),
blast radius, per-tank turn cap, and toggles for terrain destruction, falling,
terrain/tank collision, blast damage and fall damage. Draws award no round win.

## Classroom replacement

New assignments offer Football, Tanx and Sniper. Turkey Fight is removed from
new assignments and public demo navigation. Its old engine/replay paths remain
only for existing matches so a saved match is not silently reinterpreted.
Tanx is available through Classroom rather than the legacy emailed-turn API.

Classroom games use two enrolled humans, teacher snapshots of questions and
settings, normal server grading/CAS/idempotent turn submission and notification
queueing. Correct answers fire the chosen shot. Incorrect answers pass a turn
with no shell, crater or damage. The server computes the trajectory and result
using the same fixed-step pure engine as offline play; the iframe cannot grade
or save a result. Incoming iframe events check origin, window and a per-view
random token. Both players can replay the stored shot. A round ends on
elimination or a per-tank turn cap. The match ends on target wins, or at a cap
of twice target wins plus one round to bound repeated question-error draws.

The terrain collision mask is a pixel-alpha buffer with circular cuts and
preserved overhangs. The offscreen terrain canvas uses destination-out integer
runs matching those circular cuts exactly. Tank support checks three footprint
pixels; shell collision sweeps at one-pixel increments, with a 1/120 s physics
step. Shells can leave the top and return; horizontal exits miss. A 16-second
flight cap handles zero-gravity or otherwise non-returning shots. AI searches
the same wind/terrain physics before difficulty-dependent aim error.

Run `npm test`, `npm run check`, `npm run build`. `tests/tanx.test.mjs` covers
terrain, opacity cuts, flight, wind, toggles, support/falls, both-direction AI,
rounds/wins/draw limits, server validation, question grading, retries and turns.

## Battlefield graphics edition

The renderer now outputs at 1280×800 while physics coordinates remain 640×400.
It caches sunset skies, layered ridges, forests and mist per terrain seed, and
caches the textured soil/grass/scorched crater surface per terrain revision.
Brighter model bakes are embedded in the offline file and reused in commander
portraits. Barrels pivot independently. Damage adds smoke; destroyed vehicles
leave wrecks. Shell tips interpolate between saved physics samples; muzzle
flash, debris, expanding blast rings and short impact recoil are visual only.
The HUD does not shake. System reduced-motion settings disable camera recoil
and moving debris. Renderer tests cover loaded sprites, flight/impact/falling
frames, non-mutation of server state, and the terrain alpha collision mask.
