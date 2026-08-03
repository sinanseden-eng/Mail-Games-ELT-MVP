# Mail Games ELT 0.9A — Sniper Elite foundation

## Classroom concept

Sniper Elite is implemented as a fictional, non-graphic tactical prediction exercise. It does not model injury. Successful predictions produce a visible **TAGGED** result and remove one health point.

## Round rules

Each student must:

1. answer one English question;
2. choose one of four emergence positions;
3. predict which of the four positions the opponent will use.

A correct answer activates the training shot. A wrong answer still preserves the emergence choice, so the opponent's prediction remains meaningful, but the student's shot cannot score.

## Positions

1. Rooftop
2. Upper Window
3. Broken Wall
4. Supply Crates

## Resolution

- correct answer + correct prediction: one training tag;
- correct answer + wrong prediction: miss;
- incorrect answer: shot disabled;
- both correct predictions: simultaneous tags;
- health starts at three;
- the match ends at zero health or after round five;
- after round five, higher health wins and equal health is a draw.

## Security

Player B receives no Player A emergence position, target prediction, or answer status in the public turn payload. The server resolves the stored choices only after Player B submits.

## Files

- `sniper-core.mjs`
- `sniper-scene.mjs`
- `sniper-audio.mjs`
- `sniper.css`
- `assets/sniper-village-background.png`
- `supabase/migrations/007_sniper_game.sql`

## Database requirement

Run `supabase/migrations/007_sniper_game.sql` once before launching the first Sniper Elite match. This only expands the `matches.game_type` check constraint; it does not create new tables.
