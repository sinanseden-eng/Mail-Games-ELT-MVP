# Penalty Natural Keeper Replay — 0.9H2C

## Objective

Replace the remaining explanatory keeper-result graphic with one continuous photographic action sequence. The football and goalkeeper must move in the same goalmouth, while the stored shot zone and stored dive zone remain independent.

## Presentation flow

1. Goalkeeper set frame.
2. Ball appears at the strike beat and travels rapidly toward the canonical shot coordinate.
3. The keeper blends into the stored left, centre or right action frame.
4. A goal settles in the goalmouth, a save deflects away, or a miss continues beyond the target.
5. The result badge appears only after the action is readable.
6. The final still and Replay again retain the same action camera.

## Removed from the active keeper path

- Detached wireframe or miniature net.
- Separate side ball marker.
- Target pointer or trajectory guide.
- Full-screen white impact flash.
- Comic contact burst.
- Cut to the old static main-camera goal illustration.

## Architecture

`keeperNaturalActionState()` derives a display-only ball path from the canonical replay snapshot. `keeperMotionPlan()` independently derives the photographic keeper action from `keeperZone`. Neither helper mutates scoring, history, `shotZone`, or `keeperZone`.

## Data and deployment

No Supabase migration and no new Netlify environment variable are required. 0.9H2B boot recovery, request timeout, cache-busted secure-turn modules and visible reload handling remain active.
