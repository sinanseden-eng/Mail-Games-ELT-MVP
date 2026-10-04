# Football rebuild — The Penalty Club

The football section now renders directly with Canvas 2D. It requires no Blender exports, FBX files, image sequences, WebGL, or player image assets.

## Entry points

- `football.html`: immediate practice, nine targets, independent keeper decisions, finishing/catch/parry/miss drills, slow motion, pause/replay, sound, reduced motion, and adjustable net tension.
- `shootout.html`: existing two-player English challenge match with the new shared scene.
- `turn.html` and `replay.html`: existing signed email turn and replay flows with the same renderer. Email match rules still use their existing six zones.

`football-motion.mjs` samples canonical joint poses and net displacement from a stored result and time. `football-camera.mjs` projects them into an elevated sideline TV angle, with the goal on the left and the striker on the right, matching the supplied penalty reference. Pitch markings, player joints, target buttons, ball flight and the depth of the net use this same projection. `football-scene.mjs` draws the stadium and characters with Canvas 2D. Canonical shot and keeper directions remain independent. Playback cannot reroll a result or award another point.

The keeper changes joint poses through crouch, launch, full reach and landing. Catches attach the ball to the moving gloves; parries deflect it away. Goal impacts create a local net pocket with a damped wave and gravity sag. The same displaced net coordinates position the ball as it drops. Rope boundaries stay pinned. Misses and saves do not deform the net.

## Validation

Run `npm test` and `npm run check`. The motion and camera tests cover all nine directions, boot contact, projected target hit testing, independent keeper choices, outcome paths, net anchors and settling, caught-ball attachment, and preservation of answer-gated scoring. Existing backend and other-game tests remain part of the suite.

Run `npm run serve` for local development, then open `/football.html`. Practice is fully client-side. Email matches require the existing configured Netlify functions, Supabase and email provider.

The practice score is stored separately from classroom matches. The new module does not change backend game rules, send emails, migrate database records, or need additional production environment variables.
