# Mail Games ELT 0.9H2 — Deployment and Replay Validation

## What changed

Penalty Shootout keeps the dual-perspective 0.9H1 structure and corrects two live-browser issues:

1. **More realistic impact presentation**
   - the football now uses shaded, lower-contrast rendering instead of a flat cartoon marker;
   - goal impacts use thin local net deformation and a natural settling ball;
   - save contact uses brief glove compression and visible deflection rather than a neon ring;
   - post/crossbar contact uses a restrained glint rather than a comic starburst;
   - turf response is reduced to small grass/debris flecks;
   - ball-flight glow and ghosting are reduced.

2. **Perspective consistency**
   - `shotZone` and `keeperZone` are copied into canonical replay fields when playback begins;
   - goalkeeper mirroring is calculated only for the active keeper POV;
   - the post-goal main-camera cut re-derives its target from the canonical shot;
   - a mirrored display coordinate is never written back into the replay event;
   - replay-again and final stills preserve the same physical goal location.

Scoring, English questions, Gmail delivery, signed replay links, Supabase storage, Turkey Fight and Sniper Elite are unchanged.

## Deploy

1. Keep the current 0.9H1 deployment as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9h2.zip`.
3. Deploy the complete extracted `mailgames-elt-mvp-0.9h2` folder to Netlify.
4. Wait for Netlify to report **Published**.
5. Hard-refresh the browser with `Ctrl + F5`.

No SQL migration is required. No new Netlify environment variable is required.

## Priority live test

### Camera-side consistency

For both a left and right goal:

1. Submit the keeper's answer and dive.
2. Watch the incoming shot in **GOALKEEPER VIEW**.
3. Let the replay cut to **GOALKEEPER VIEW · MAIN CAMERA**.
4. Confirm the main camera shows the canonical shot location rather than the mirrored keeper-screen location.
5. Press replay again and confirm the side does not alternate.

Example:

- canonical shot: `bottom-left`;
- keeper POV projection: visually `bottom-right`;
- main camera/final still: canonical `bottom-left`.

### Visual realism

Confirm that:

- the ball is shaded and integrated with the scene;
- no cartoon impact rays, neon save ring or target-wheel graphic appears;
- the net bends only around the actual impact point;
- the ball settles naturally after a goal;
- a save redirects the ball from glove contact;
- post/crossbar contact uses a brief restrained highlight;
- result text appears after the action is readable.

### Coverage

Test all six zones and at least:

- one wrong-way goal;
- one correct-zone save;
- one miss;
- one post or crossbar outcome;
- one replay repeated twice;
- desktop and mobile layouts;
- reduced-motion mode;
- sound muted and unmuted.

## Validation performed

- JavaScript syntax verification: passed
- Automated tests: 151 passed, 0 failed
- No Supabase migration
- No new Netlify variable

A live Netlify/browser test is still required for final animation timing, image loading, audio balance and mobile cropping.
