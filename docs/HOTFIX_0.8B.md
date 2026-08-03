# Mail Games ELT 0.8b — Close-combat choreography hotfix

Version 0.8b addresses the first visual-test finding after the 0.8a arena-rendering repair: the fighters were visible, but they remained too far apart for attacks and defences to feel like a fight.

## Changes

- Sir Gobbles and Ninja Wing begin larger and lower in the foreground.
- Both fighters step toward the centre before the exchange.
- Charge, Peck and Wing Slap reach maximum extension at the stored impact beat.
- Block, Duck and Counter animate while the opponent attacks.
- Attack streaks and impact bursts use the fighters' live positions instead of fixed distant coordinates.
- A restrained camera push and impact shake improve readability.
- Reduced-motion mode disables camera shake.

## Unchanged

- Supabase schema
- Gmail credentials and provider setup
- signed turn and replay tokens
- server-authoritative damage, health and winner calculation
- teacher question packs and CSV import

No migration or new environment variable is required.
