# Penalty Shootout 0.9H1 — Role-Based Dual-Perspective Replay

## Objective

Present the same resolved penalty from the viewpoint of the player watching it. The striker sees the pitch-facing attacking camera; the keeper sees the taker and incoming ball from the goal line. The football and goalkeeper action communicate the result without a detached target diagram.

## Architecture

`result_snapshot.replay` remains the single canonical event. It stores shot zone, keeper zone, outcome, score and activity state but no camera role. A transient `viewer.role` is derived from the verified recipient or the already verified keeper turn and passed to the renderer.

- `penalty-perspective.mjs` normalizes roles, mirrors six goal zones for keeper projection and provides accessibility labels.
- `shootout-cinematics.mjs` selects striker or keeper camera planning.
- `penalty-visuals.mjs` renders the fast ball flight, keeper POV, gloves and on-goal impact.
- `shootout-scene.mjs` preserves the role through playback, final still and replay-again.
- `get-replay.mjs` returns signed viewer context without changing stored history.
- `turn.js` starts the defending player's immediate result in keeper view.
- `replay.js` starts the signed recipient's result in the server-supplied role.

## Perspective rule

Canonical zones are recorded from the attacker's orientation. Keeper view mirrors left and right only at render time:

- top-left ↔ top-right
- bottom-left ↔ bottom-right
- centre zones remain centred

Vertical level and the underlying match event do not change.

## UI behaviour

### Penalty taker

Run-up → boot contact → fast visible ball flight → stored keeper dive → on-goal impact/save/miss → delayed result.

### Goalkeeper

Keeper set → distant taker approach → strike → fast incoming football → stored dive/glove action → goal/save/miss → delayed result.

No player-facing camera switch is provided. A signed recipient cannot override the server-supplied role with a URL parameter.

## Preserved systems

No change to scoring, question validation, secret choices, Gmail delivery, token format, Supabase schema, Turkey Fight or Sniper.
