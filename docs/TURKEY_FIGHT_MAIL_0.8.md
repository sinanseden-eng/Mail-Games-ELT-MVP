# Turkey Fight Mail — 0.8

## Goal

Version 0.8 connects Turkey Fight Mail to the same secure email-turn system already proven by Mail Penalty Shootout. It adds a distinct 2.5D farm arena, answer-gated attacks and defences, immediate result animation for the second fighter, and a signed replay email for the first fighter.

## Player flow

1. Fighter A opens a signed single-use email link.
2. The farm arena stays visible while the English question is answered.
3. After submitting the answer, six move controls unlock.
4. Fighter A chooses a secret move and sees a waiting state.
5. Fighter B receives the next-turn email. The API conceals Fighter A's move and whether it is active.
6. Fighter B answers, chooses a move, and watches the resolved exchange immediately.
7. Fighter A receives a **Watch the fight** email with a signed replay link.
8. The next round starts with a fresh Fighter A turn unless a fighter has reached zero health.

## Fighters and moves

- **Sir Gobbles** — Player A
- **Ninja Wing** — Player B

Available moves:

- Wing Slap — attack
- Peck — attack
- Charge — attack
- Block — defence
- Duck — defence
- Counter — defence

A correct English answer activates the selected move. An incorrect answer records the choice but makes it futile for that exchange.

## Resolution model

The Netlify Function game engine calculates all damage. Browser animation never decides the result. The replay record contains:

- both selected moves;
- both answer-active states;
- move effects;
- damage to each fighter;
- health before and after;
- streaks;
- round caption and message;
- match completion and winner.

The same stored replay object drives Fighter B's immediate animation and Fighter A's emailed replay, preventing visual and database outcomes from drifting apart.

## Security and privacy

- Turn links remain signed and single-use.
- Result replay links are signed separately.
- Fighter B's turn response conceals Fighter A's move, active state and originating turn ID.
- Existing test-code launch protection and recipient allowlist remain active.
- Gmail only sends messages; the app does not read either player's inbox.

## Technical files

- `turkey-core.mjs` — move metadata and result labels
- `turkey-scene.mjs` — procedural 2.5D arena, fighters and animations
- `turkey-audio.mjs` — lightweight synthesized fight cues
- `turkey.css` — Turkey-specific live-turn and replay presentation
- `netlify/functions/_shared/game-engine.mjs` — server-authoritative move resolution
- `netlify/functions/_shared/email.mjs` — Turkey result email
- `turn.js` / `replay.js` — shared game-type routing and playback

## Deployment impact

No Supabase migration and no new Netlify environment variable are required. Deploy the 0.8 files over 0.7.3, then create a fresh Turkey Fight Mail match for testing.
