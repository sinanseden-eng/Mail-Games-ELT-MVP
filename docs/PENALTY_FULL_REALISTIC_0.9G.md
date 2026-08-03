# Penalty Shootout 0.9G — Full Realistic Screen Rebuild

## Objective

Use one coherent photographic football world before and after the result. The English question and six-zone selection no longer sit over the procedural cartoon striker and goalkeeper.

## Visual coordinate system

`assets/penalty-0.9f/striker-1.jpg` is the calibrated selection frame. It contains:

- the striker at a believable approach angle;
- the ball on the penalty spot;
- the goalkeeper centred on the line;
- the complete goal mouth and net.

`REALISTIC_SELECTION_POINTS` in `penalty-visuals.mjs` stores the ball, goalkeeper and six goal-zone points in the 1280×720 scene coordinate system. The HTML buttons and the selected shot/dive guide use the same points.

## Rendering contract

`ShootoutScene.draw()` now has only three normal visual states:

1. `drawSelection()` for unresolved turns;
2. `drawCinematic()` for resolved replay playback;
3. `drawResultStill()` after playback.

The procedural drawing functions remain in the module for historical utilities and physics tests, but the normal draw path does not call them.

## Reliability

If a photographic frame is still decoding, `drawLoadingFrame()` displays a dark stadium-loading state. It does not reveal the old cartoon scene.

## Unchanged systems

- question validation;
- secret move storage;
- penalty resolution;
- score updates;
- Gmail delivery;
- signed turn and replay tokens;
- Supabase schema;
- Turkey Fight and Sniper presentation.
