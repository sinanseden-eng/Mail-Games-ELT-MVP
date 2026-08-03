# Penalty Shootout 0.9H4 — Single-Angle Six-Zone Replay

## Purpose

0.9H4 removes the role-dependent penalty cameras. Both players now watch the same fixed broadcast-style angle based on the original photographic penalty setup.

## Movement model

The replay keeps the server-authoritative `shotZone`, `keeperZone` and `outcome` unchanged. Presentation maps them independently:

- `SINGLE_ANGLE_SHOT_MOVES` supplies six taker follow-through and ball-flight profiles.
- `SINGLE_ANGLE_KEEPER_MOVES` supplies six goalkeeper movement profiles.
- `singleAngleBallState()` calculates the visible ball path, spin, shadow, save deflection, miss continuation and net settling.
- `singleAngleKeeperState()` calculates launch and extension timing without changing the stored keeper choice.

## Camera rule

`drawCinematic()` always delegates to `drawSingleAngleCinematic()`. Signed viewer roles remain part of token security and recipient delivery, but do not select a camera.

## Assets

`assets/penalty-single-angle/` contains the cleaned stadium plate, two taker sprites and five goalkeeper source sprites used to construct all six movements.

## Data impact

No Supabase migration, scoring change, token change or Netlify variable is required.
