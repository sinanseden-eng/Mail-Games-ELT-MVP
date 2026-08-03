# Mail Games ELT 0.9B — cinematic sniper action pass

## Purpose

0.9B keeps the secure 0.9A prediction rules and adds a much clearer visual replay. The scene depicts fictional tactical training with visible shots and strong reactions, but no blood, wounds or graphic injury.

## Cinematic sequence

1. Both soldiers emerge from the stored cover positions.
2. Each soldier raises and aims a rifle toward the stored prediction.
3. Active shots show recoil, muzzle flash and a bright travelling tracer.
4. A correct prediction produces a clean vest-impact flash, dust and a visible body reaction.
5. An incorrect prediction strikes the predicted piece of scenery and creates debris and a MISS marker.
6. An incorrect English answer produces a trigger click and no projectile.
7. A zero-health hit produces a larger drop-behind-cover reaction.
8. The stored result and health remain server-authoritative.

## Visual additions

- depth-scaled tactical characters at all four positions;
- direction-aware aiming and rifle poses;
- separate Player A and Player B firing beats;
- travelling projectile/tracer animation;
- muzzle flash, recoil and light camera shake;
- wall, roof and crate dust impacts for misses;
- clean vest flash and stumble/drop response for hits;
- stronger final-hit reaction when health reaches zero;
- generated Web Audio gunshot, click and impact cues;
- reduced-motion mode still jumps to the resolved result.

## Unchanged systems

- Supabase schema and `007_sniper_game.sql`;
- Gmail delivery and recipient allowlist;
- signed replay links;
- hidden Player A choices;
- question scoring;
- health and five-round limit;
- Penalty Shootout and Turkey Fight routing.
