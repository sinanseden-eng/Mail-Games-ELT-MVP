# Shootout 0.5A implementation notes

This milestone implements the first playable grey-box scene described in `PENALTY_SHOOTOUT_BLUEPRINT_0.5.md`.

## Files

- `shootout.html` — standalone prototype page
- `shootout.css` — responsive scene and control-panel styling
- `shootout.js` — canvas scene, question flow, animation and spring net
- `shootout-core.mjs` — deterministic match rules and reusable state helpers
- `tests/shootout-core.test.mjs` — rule-matrix and role-alternation tests

## What is deliberately grey-box

The striker and goalkeeper are drawn from simple canvas shapes. They prove pose timing, scene composition and replay logic before final illustrated sprite rigs are produced.

## Reactive net

The net uses a 17 × 9 grid. Interior points have a shallow resting depth and receive local velocity impulses when a goal reaches the selected target. Neighbour coupling creates a ripple; damping returns the mesh to rest. Boundary points remain attached to the goal frame.

## Current limitation

This is a local two-player prototype. It reads the Teacher Studio question bank from browser `localStorage`. Mission Control email turns still use the existing `turn.html` interface. The next integration milestone will let a server-resolved penalty round trigger this replay scene.
