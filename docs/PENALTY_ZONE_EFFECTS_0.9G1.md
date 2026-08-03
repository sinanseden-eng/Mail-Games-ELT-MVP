# Penalty Shootout 0.9G1 — Zone-specific trajectories and impacts

## Objective

Make the selected goal coordinate visible throughout the complete realistic replay. No two target areas should appear to send the ball to the same place.

## Six trajectory profiles

- Top left and top right: steep rising shots with opposite lateral bend.
- Top centre: the highest, most direct trajectory.
- Bottom left and bottom right: flatter driven shots with opposite lateral bend.
- Bottom centre: the lowest and most direct trajectory.

All active goal and save paths terminate at the calibrated point stored in `REALISTIC_SELECTION_POINTS`.

## Keeper reactions

The stored goalkeeper coordinate chooses the direction, height and mirrored reaction frame shown before contact. A successful save keeps the glove effect at the same coordinate as the ball.

## Outcome effects

- Goals: upper-side, roof, lower-side or low-centre net waves.
- Saves: glove flash plus a direction-aware deflection trail.
- Misses: bar glance, over the bar, wide left/right or a scuffed wide shot.

## Unchanged systems

Question validation, turn secrecy, match resolution, score updates, email delivery, signed links, Supabase and the other two games are unchanged.
