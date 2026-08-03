# Penalty Shootout 0.9H — Animation Polish

## Objective

Polish the working 0.9G2 realistic replay without changing its stored coordinates or game rules. The emphasis is clearer movement and physical follow-through rather than a new camera architecture.

## Motion changes

- The five striker photographs are blended continuously through setup, run-up, plant, contact and follow-through.
- Boot contact adds a short compression pulse, turf response and contact ring at the deterministic strike time.
- The football rotates, becomes smaller with depth, carries a short photographic motion blur and casts a ground-referenced shadow.
- The goalkeeper blends from ready stance into a side- and height-specific dive frame.
- A save continues past glove contact into a visible deflection.
- Goal net strands oscillate with a damped ripple around the chosen coordinate before settling.
- Crossbar misses rebound into the field; wide and over shots continue away from the goal.

## Audio changes

Strike and impact cues now vary by shot height and outcome. Goal net, glove, turf and crossbar contacts use different synthesized sound profiles without external audio files.

## Preserved systems

Question validation, secret choices, deterministic resolution, score updates, Gmail delivery, signed links, Supabase schema, Turkey Fight and Sniper are unchanged.
