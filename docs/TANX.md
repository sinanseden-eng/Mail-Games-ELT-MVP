# Tanx Artillery Club

`tanx.html` is a complete offline game. Double-click to play: no server, modules,
fonts, CDNs, image requests or installation. `tanx.template.html`, `tanx-core.mjs`
and `tanx-ui.js` are editable sources. `node scripts/build-tanx.mjs` regenerates
that single deliverable, including the two uploaded Meshy tank sprite bakes.

## Fracture Arenas / cinematic 2.5D

The opening setup offers two illustrated arena choices: Neon Industrial (night
city, steel scaffolding and highway remnants) and Desert Frontier (late-afternoon
architecture, sandstone/concrete outposts and sandbags). Teacher assignments have
the same arena setting. The renderer is now `tanx-industrial.mjs`: Canvas-based
2.5D depth, generated backdrop/material art, independently animated tank barrels,
live wind/health/power/ammo HUD, fires, dust, smoke, blast light and falling debris.
Cinematic and lower-effects Tactical views share identical physics. No WebGL,
CDN, model download or runtime import is required by the standalone HTML.
The earlier `tanx-3d.mjs` remains source history but is no longer bundled.

New matches place every tank directly on natural earth or rock, with a small
level firing pocket blended into the surrounding landscape. No starting tower,
scaffold, concrete pad or elevated outpost is generated beneath a tank. Two-player
positions remain x=65 and x=575, about 80% of the arena width apart.

Both arena themes and teacher assignments offer five terrain profiles:

- Plain Lands (`gentle`): low relief and open sightlines.
- Hills (`rolling`): several broad hills enclosing sheltered firing positions.
- Mountains (`mountains`): tall ridges and valleys that require higher arcs.
- Deep Canyons (`canyon`): steep rims, deep drops and breakable bridge ends.
- Fortress Ridges (`fortress`): repeated jagged ridges and ruined cover walls.

The setup includes a live silhouette sample with marked natural starting
positions and a short difficulty description. The HUD names the active terrain.
This relief is collision geometry, not background scenery: hills block low shots,
craters open routes, and disconnected cover settles into collidable debris.
Natural pockets are kept clear of tanks and muzzles; deep-canyon spawn positions
stay above the HUD. Other ruins and bridge remnants remain outside spawn zones.

Terrain generation is versioned. New matches use `terrainVersion: 2`; stored
configs without that field reconstruct with version 1. Ordered crater history
rebuilds both material and opacity pixels for the appropriate version, preserving
existing classroom matches and their stored replay paths.

Ammunition is an enum checked by the server: Standard uses baseline blast/damage;
Demolition uses 1.4× radius with 0.65× damage; Precision uses 0.65× radius with
1.2× damage. All are fictional gameplay values. The classroom iframe forwards
ammo with angle/power; question grading and turn resolution remain authoritative.
Wrong answers create no shell, crater, blast damage or structure collapse.
The HUD remains steady during light camera recoil. Reduced-motion disables recoil
and flying debris; Tactical view also removes ambient smoke/searchlights.

`tests/tanx-terrain.test.mjs` checks all five profiles in both themes, natural
2–4-player placement, actual cover, reachable AI shots and legacy-map hashes.
`tests/tanx-arenas.test.mjs` covers separated spawns, material determinism, support
collapse and debris collision, tank drops, ammo validation/trade-offs, both AI
and classroom integration, and actual loaded-asset rendering in both themes.

## Local play

2–4 human/CPU commanders, randomly seeded terrain, 0–180° angle and 0–100% power.
Arrow keys/A-D/W-S adjust aiming; tap Space to fire, hold Space to charge and
release to fire; P pauses. Touch has sliders, exact numbers, ± controls, Fire and
hold-to-charge. Sound is synthesized with Web Audio after explicit opt-in.
The setup includes five terrain profiles, Rookie/Veteran/Elite CPU,
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

## Artwork and packaging

`assets/tanx/README.md` records the source tank bakes and generated art prompts.
`scripts/build-tanx.mjs` embeds both tank PNGs, three WebP artwork assets, the
shared engine, renderer and UI into one HTML. Original large Meshy GLBs remain
outside the runtime. `battlefield-preview.webp` is exported from the real game
renderer for the main hub card. Native render checks exercise 1280×800 output;
public-preview browser checks cover the setup, both arenas, aiming and replay.
