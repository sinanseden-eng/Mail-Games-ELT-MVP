# Mail Games ELT 0.9E — Penalty cinematic rebuild

0.9E brings the Penalty Shootout replay closer to the visual language of the Sniper game while preserving the existing deterministic match engine.

## Replay sequence

1. Wide stadium establishing view
2. Tracked striker run-up
3. Behind-the-ball player view
4. Visible boot-to-ball contact and compression
5. Ball-follow camera using the stored physical trajectory
6. Outcome camera:
   - net camera for a goal
   - glove camera for a save
   - miss camera for a wide or over-bar attempt
7. Wide reaction and result reveal

## Presentation changes

- Large foreground striker layer during the player-view phase
- Plant leg, kicking leg, boot follow-through and contact flash
- Dynamic zoom, pan, rotation, impact shake and letterbox framing
- Ball-camera speed readout and camera labels
- Goal, save and miss contact effects remain distinct
- Camera-transition, boot, glove and net sounds are synthesized in the browser

## Unchanged systems

- English question logic
- Secret shot and dive choices
- Server-side goal/save/miss resolution
- Match scores and turn order
- Gmail invitations and result messages
- Signed replay tokens
- Supabase schema and Netlify environment variables
- Turkey Fight and Sniper Elite routing
