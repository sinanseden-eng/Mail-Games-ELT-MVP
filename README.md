# Mail Games ELT — MVP 0.9H4





## 0.9H4 — Single-angle six-zone penalty replay

Penalty Shootout now uses one fixed broadcast-style photograph for every replay. The penalty taker and goalkeeper remain in the same frame from run-up through impact. Six shot profiles control the taker's follow-through and ball path, while six independent goalkeeper profiles control high-left, high-centre, high-right, low-left, low-centre and low-right movement. Viewer roles still secure delivery, but no longer change the camera.

- One camera for striker, goalkeeper and replay-again
- Six dedicated taker movement profiles
- Six dedicated goalkeeper movement profiles
- Natural ball acceleration, spin, shadow, saves, misses and net settling
- No POV switches, helper diagrams, mini nets or detached impact panels
- No Supabase migration or new Netlify environment variable

## 0.9H3 — Striker and goalkeeper motion realism

This release keeps the single photographic goalmouth introduced in 0.9H2C and improves how the action moves inside it:

- faster, more decisive ball launch with the same exact stored endpoint;
- keeper anticipation, takeoff, full extension and landing phases;
- shorter motion-matched frame transitions instead of long double exposures;
- subtle ball-attached motion blur rather than a pointer or trail;
- contact compression on saves and restrained integrated net ripple on goals;
- unchanged scoring, email delivery, Supabase state and viewer-specific perspectives.

## 0.9H2C — Natural goalkeeper action replay

- replaces the keeper-view helper net and static result illustration with one photographic action camera;
- shows the ball travelling in the same goalmouth as the goalkeeper's stored jump or dive;
- keeps shot destination and keeper direction independent, so wrong-way goals are immediately readable;
- continues goals, saves and misses naturally without pointers, flashes, target markers or detached net graphics;
- keeps the 0.9H2B boot recovery and cache protection.

## 0.9H2 — Realistic impact and camera consistency

- replaces comic-style net, save and post bursts with shaded football contact, restrained net deformation and subtle turf/post reactions;
- keeps the authoritative `shotZone` and `keeperZone` canonical throughout playback;
- mirrors only the active goalkeeper POV projection;
- re-derives the final main-camera target from the canonical event, preventing opposite-side results after a keeper replay.


## 0.9H1 — Role-based dual-perspective penalty replay

Penalty Shootout now presents the same server-authoritative kick from the correct player's viewpoint. The striker's signed replay uses the penalty-taker camera, while the goalkeeper's immediate resolved-turn replay uses a goal-line viewpoint with a fast incoming ball, role-correct camera lean and close glove/net response. The detached miniature net, directional pointer and dashed deflection guide are removed; the ball itself reaches the real stored destination. All six zones are mirrored only for visual projection in keeper view, while the stored shot, dive, result and score remain unchanged. No Supabase migration or new Netlify variable is required.

## 0.9H — Penalty animation polish

Penalty Shootout keeps the unified realistic 0.9G2 architecture and improves the motion inside it. Run-up poses now dissolve into one another instead of hard-cutting; boot contact adds compression and turf response; the ball carries visible spin, perspective scaling, motion blur and a grounded shadow; the goalkeeper moves through set and dive frames; saves deflect away from the gloves; goals produce a damped elastic net ripple; and bar misses rebound visibly into the field. Zone-aware strike, glove, net, turf and crossbar sounds remain browser-generated. Questions, scoring, Gmail, signed links, Supabase and the other games are unchanged.


## 0.9G2 — True on-pitch penalty action replay

Penalty Shootout now replaces the static result-card feel with a full-frame action sequence: realistic run-up, clear goal-facing ball flight, goalkeeper action and dedicated net/glove/miss cameras. Goal impacts deform local net strands instead of displaying a radar-style target wheel. The six 0.9G1 trajectories, scoring, email turns, signed links and Supabase data remain unchanged.

## 0.9G1 — Zone-specific realistic penalty effects

Penalty Shootout now preserves the chosen coordinate through the entire realistic replay. Each of the six targets has its own curve, height, keeper reaction and goal/save/miss impact. The 0.9G photographic selection scene, scoring, email turns, signed replay tokens, Supabase data and server-authoritative result remain unchanged.


> **0.9E1 kick-and-goal hotfix:** fixes the full-motion penalty replay stopping before boot contact. The undefined easing call that crashed the render loop has been removed; the proven wide-shot pitch and net remain continuously rendered, and the close kick view now draws its own visible ball. The dedicated shootout prototype also no longer stops on an unused undefined layout reference.

> **0.9E penalty cinematic rebuild:** the stable 0.9D package now gives Penalty Shootout a full broadcast-to-player-view replay: stadium establish, tracked run-up, behind-the-ball boot contact, ball camera, dedicated net/glove/miss impact camera, and outcome-specific physical follow-through. Scoring and email flow are unchanged.

> **0.9D precision replay polish:** the working 0.9C1 scope now tracks onto the stored prediction, tightens a visible lock indicator, fires with staged recoil and projectile pressure wake, then shows a stronger clean vest-sensor reaction with synchronized lock, report, impact, echo, and bolt-cycle audio.

> **0.9C1 hotfix:** the scope mask now preserves the rendered village and target soldier inside the lens. A dedicated in-lens muzzle flash, tracer, impact burst, and TAGGED/MISS cue make the shot readable before the camera cuts away.

> **0.9C1 scope-visibility hotfix:** each resolved Sniper Elite shot now moves from the wide village view into the firing soldier’s scope point of view, follows the stored prediction through recoil and tracer travel, then cuts to a clear non-graphic target reaction.

A zero-build, Netlify-ready prototype for three teacher-editable ELT games:

- **Mail Penalty Shootout**
- **Turkey Fight Mail**
- **Sniper Elite!** — a non-graphic tactical prediction exercise

Students answer an English question before selecting their game choices. A correct answer activates the shot or move; an incorrect answer makes it futile. In Sniper Elite, the student still emerges from the chosen cover after a wrong answer, but cannot score a training tag.

## Included in this milestone

### Natural goalkeeper action replay — 0.9H2C

- One photographic action camera now carries the keeper replay from set position through the final result
- Existing keeper frames blend from ready stance into the stored left, centre or right dive
- The visible football follows the canonical stored shot coordinate in the same full scene
- Goalkeeper movement and shot destination are calculated independently
- Goals settle in the goalmouth, saves deflect away and misses continue beyond the frame
- The detached wireframe net, side ball marker, white flash, target pointer and helper panel are absent from the active keeper path
- Replay-again and the final still remain on the same natural action camera
- 0.9H2B request timeout, boot watchdog and reload recovery remain enabled
- No backend, scoring, email, token, Supabase, Turkey Fight or Sniper changes

### Realistic impact and camera consistency — 0.9H2

- Shaded football rendering replaces the flat cartoon marker
- Goal impacts use restrained local net deformation and natural settling
- Saves use glove compression and physical deflection without a neon contact ring
- Misses and frame contact use subtle turf/post reactions instead of comic bursts
- Keeper POV mirroring is display-only and never changes the canonical event
- The final main camera restores the original shot side after goalkeeper view
- Replay-again cannot alternate the result side
- No backend, scoring, email, token, Supabase, Turkey Fight or Sniper changes

### Dual-perspective replay — 0.9H1

- Signed striker replays open in **PENALTY TAKER VIEW**
- The defending player watches the resolved kick immediately in **GOALKEEPER VIEW**
- One canonical stored event powers both views; perspective never changes scoring or match history
- All six goal zones mirror correctly when seen from behind the goal line
- The football travels quickly to the stored destination while the keeper commits to the stored dive
- Goal, glove contact, deflection, post/bar and miss behaviour occur on the main scene rather than a detached mini-net
- Replay-again preserves the viewer's original role
- Canvas accessibility labels identify the active perspective
- Role-aware synthesized audio makes boot contact stronger for the taker and nearby glove/net contact stronger for the keeper
- No database, scoring, Gmail, token format, Turkey Fight or Sniper changes

### Penalty animation polish — 0.9H

- Five realistic striker poses dissolve smoothly through setup, run-up, plant, contact and follow-through
- Boot contact adds a compressed ball, contact ring and turf response at the stored strike time
- Ball flight includes visible rotation, perspective size change, short motion blur and a pitch-grounded shadow
- Goalkeeper presentation blends from ready stance into the selected high/low and left/centre/right action
- Saves show a glove flash followed by a visible direction-aware deflection
- Goal net strands oscillate and settle locally around the exact selected impact point
- Top-corner bar misses rebound back into the field; wide and over outcomes continue naturally away from goal
- Strike and impact audio changes subtly by shot height, goal, glove contact, turf miss or crossbar contact
- Full replay timing is extended slightly for readability while reduced-motion mode remains available
- No backend, scoring, email, token, Supabase, Turkey Fight or Sniper changes

### Zone-specific trajectories and impacts — 0.9G1

- Six distinct trajectories terminate at the exact selected photographed coordinate
- High shots rise more sharply; low shots stay flatter; side shots bend left or right
- Goalkeeper reaction camera follows the stored high/low and left/centre/right dive
- Goals create upper-side, roof, lower-side or low-centre net effects
- Saves create a glove flash and direction-aware deflection
- Misses vary among bar, over, wide and scuffed-wide outcomes
- Final result frame preserves the selected impact location
- No backend, Gmail, Supabase or other-game changes

### Full realistic penalty screen rebuild — 0.9G

- One photographic penalty setup is used for arrival, question, striker aim and goalkeeper prediction
- Real striker, ball, goalkeeper and goal positioning calibrated to the blueprint composition
- Six goal coordinates repositioned directly over the photographed goal mouth
- Subtle shot or dive guide appears only after a coordinate is selected
- Stored goal, save and miss replays stay photographic through the final frame
- The old cartoon penalty drawing methods are bypassed in normal selection and replay
- A dark non-cartoon loading screen is used if an image has not finished decoding
- Penalty logic, Gmail delivery, replay security, scoring and database behavior are unchanged

### Penalty visual and animation rebuild — 0.9F

- Generated floodlit-stadium crowd and pitch texture integrated into the live canvas
- Five-stage realistic striker sequence: set, run-up, plant, boot contact and follow-through
- Five-stage goalkeeper reaction sequence shown as a timed broadcast insert
- Frame blending, camera drift, zoom, contact flash and outcome-specific colour treatment
- Goal, save and miss impact cuts driven by the stored replay result
- Stable 0.9E1 ball flight, glove contact and volumetric net animation remain visible after the photo-realistic kick cut
- Asset loading is fail-safe: the programmed canvas renderer continues if an image is delayed or unavailable

### Penalty cinematic foundation — 0.9E / 0.9E1

- Wide stadium establish followed by a tracked striker run-up
- Behind-the-ball camera with a large foreground striker layer
- Visible planted leg, kicking-leg swing and boot-to-ball contact
- Contact compression and turf/energy detail at the strike frame
- Programmed ball flight remains deterministic and now receives a dedicated ball camera
- Goal camera focuses on the exact stored net pocket and volumetric ripple
- Glove camera focuses on keeper contact, recoil and the existing deflection path
- Miss camera follows the stored wide/over-bar continuation instead of cutting away early
- Match-camera labels, speed readout, letterboxing, camera-cut audio and stronger boot/glove/net cues
- Existing questions, secret choices, scores, Gmail messages, signed replays, Supabase schema and server resolution are unchanged

### Sniper Elite precision replay polish — 0.9D

- Scope camera glides from an offset entry onto the stored predicted position
- Reticle sway reduces as the player holds their breath
- Tightening lock brackets, range readout and lock percentage
- Sharp recoil kick followed by a controlled recovery
- Bright projectile core, tracer tail, pressure ring and brief muzzle smoke
- Stronger non-bloody vest-sensor flash, sideways snap and stagger
- Zero-health hits continue into a larger drop behind cover
- Synchronized scope-lock, rifle crack, valley echo, impact and bolt-cycle cues
- No scoring, health, concealment, Gmail, Supabase or routing changes

### Sniper Elite visible scope combat — 0.9C1

- Wide establishing view preserves the four-position tactical layout
- Separate Player A and Player B scope point-of-view shots
- Scope housing, reticle, breath sway, range marks and first-person rifle silhouette
- Camera zoom centres on the stored predicted position rather than inventing a target
- Recoil lifts the scope and tracer before the target-reaction camera takes over
- Clear hit, miss and disabled-trigger outcomes remain non-graphic
- Pause/resume and skip-to-result controls on immediate and signed replays
- Synthesized scope-focus audio cue added without external media
- Reduced-motion mode still jumps directly to the stored result
- No database, Gmail, token, concealment or scoring changes

### Sniper Elite cinematic action — 0.9B

- Tactical characters emerge, aim and fire from all four stored positions
- Separate Player A and Player B firing beats keep simultaneous rounds readable
- Visible travelling tracer/projectile instead of an instant line
- Direction-aware rifle pose, muzzle flash, recoil and subtle camera shake
- Correct predictions create a bright vest impact, dust and a clear stumble/drop reaction
- Zero-health hits create a stronger drop-behind-cover finish
- Misses strike the predicted rooftop, window, wall or crates with debris and dust
- Incorrect answers create a trigger click and no projectile
- Browser-generated shot, click and impact audio; no external sound files
- No blood, wounds or graphic injury
- Backend, Supabase schema, Gmail delivery, concealment and scoring are unchanged

### Sniper Elite secure prediction game — 0.9A

- Third game option in Teacher Studio and the local classroom demo
- Four distinct positions: Rooftop, Upper Window, Broken Wall and Supply Crates
- Two secret choices per player: emergence position and predicted rival position
- Correct answer + correct prediction scores one non-graphic training tag
- Incorrect answers keep the emergence choice but disable the student's shot
- Three health points per player and a five-round maximum
- Simultaneous tags are supported when both predictions are correct
- Player A's choices and answer status are concealed from Player B
- Player B watches the resolved round immediately; Player A receives a signed replay email
- Generated realistic mountain-village background integrated into live turns and replays
- New `007_sniper_game.sql` migration extends the existing `matches.game_type` constraint
- No new Netlify environment variable is required

### Turkey Fight Mail close-combat hotfix — 0.8b

- Fighters advance from opposite sides before the exchange
- Larger foreground scale and a subtle impact camera make the action easier to read
- Wing Slap, Peck and Charge now reach the opponent at the stored contact beat
- Block, Duck and Counter animate during the incoming attack rather than afterward
- Server damage, health, Gmail delivery and signed replays remain unchanged

### Turkey Fight Mail email game — 0.8

- New procedural 2.5D farm arena with barn, fence, spectators, layered fighters and health displays
- Two named fighters: **Sir Gobbles** and **Ninja Wing**
- Six answer-gated moves: Wing Slap, Peck, Charge, Block, Duck and Counter
- Fighter A's move and answer status remain concealed while Fighter B takes the second turn
- Fighter B watches the resolved exchange immediately after submitting
- Fighter A receives a Gmail message with a signed **Watch the fight** replay link
- Replay pages reproduce stored moves, damage, health, winner and English-answer review
- Server-authoritative attack/defence matrix with deterministic damage and no browser-side scoring drift
- Existing Teacher Studio question packs, recipient allowlist, Gmail provider and Supabase schema are reused
- No Supabase migration and no new Netlify environment variable are required

### Matchday sound, timing and celebrations — 0.7.3

- New ready, anticipation, strike, impact, result-reveal and settle beats for a more readable penalty sequence
- Optional sound control shared by the standalone shootout, live email turn and signed replay pages
- Browser-generated whistle, boot, glove, net, crowd and result cues with no downloaded audio files
- Emailed replay links wait for a **Play penalty** gesture so browsers can legally unlock sound
- Different GOAL, SAVED and MISSED banners, particle treatments and late character reactions
- Goal celebrations lift the striker's arms; saves raise a goalkeeper glove; failed attempts show disappointment
- Sound preference is stored locally and reduced-motion behavior remains supported
- Supabase schema, Gmail settings, turn tokens and server-authoritative scoring are unchanged

### 2.5D character and scene presentation — 0.7.2

- Layered, depth-aware striker and goalkeeper assembled from shaded body parts instead of flat placeholder shapes
- Direction-aware goalkeeper limb ordering, dimensional gloves, boots, jersey panels and contact shadows
- More natural striker run-up pose, body lean, support leg and kicking-leg follow-through
- Stadium tiers, crowd, floodlights, sun glow, richer turf and foreground grass detail
- Goal-mouth interior shading, dimensional post highlights and stronger front/rear frame separation
- Subtle translucent net surfaces plus brighter depth-aware cords while retaining the existing sag and impact simulation
- More spherical football lighting, secondary panels, rotating seams and clearer specular highlights
- Shared implementation remains active on the standalone shootout, live email turn and signed replay pages
- Gameplay, Supabase schema, Gmail configuration and authoritative server scoring are unchanged

### Ball physics and sagging-net polish — 0.7.1

- New deterministic `shootout-physics.mjs` engine shared by the local prototype, emailed turns and replay page
- Zone-specific rising, dipping and curving shot trajectories with perspective-correct ball scale
- Ball spin based on travel, speed-sensitive squash/stretch, motion trail and moving pitch shadow
- Goal follow-through into separate roof, side and rear-net pockets with visible settling
- Keeper contact timing, airborne dive arcs, glove deflections and landing compression
- Misses continue naturally wide or over the bar instead of disappearing at the goal plane
- Stronger roof, rear and side resting sag with gravity, floor bounds and delayed secondary ripples
- Server scoring remains authoritative; the browser only animates the stored goal/save/miss result
- No Supabase migration and no new Netlify environment variables are required

### Cinematic email turns and result replays — 0.7

- Penalty takers and goalkeepers see the calibrated 0.5E pitch while answering and choosing directions
- Six pitch zones unlock after the player enters an answer
- The striker's target remains concealed from the goalkeeper in the API response
- The goalkeeper watches the resolved penalty animation immediately after submitting
- The striker receives a Gmail result message with a **Watch the penalty** button
- Signed replay links can be opened repeatedly until their 30-day expiry
- Replay pages show the stored shot, dive, score, outcome, and English-answer review
- Result email and next-turn email are sent separately so the match continues correctly
- No Supabase migration and no new Netlify environment variables are required


### Gmail API two-inbox delivery — 0.6G

- Gmail API OAuth sender for different recipient inboxes without buying a domain
- Narrow `gmail.send` permission; no inbox reading or deletion access
- Local OAuth helper for obtaining a refresh token without storing credentials in the project
- Resend retained as an optional verified-domain fallback
- Private `MAILGAMES_TEST_CODE` required to launch matches from the public prototype
- `MAIL_TEST_ALLOWED_RECIPIENTS` limits delivery to teacher-controlled test inboxes
- Delivery status, provider ID and errors recorded on each pending turn
- Teacher recovery tool for checking a pending turn and opening its secure link
- Existing Supabase match state, signed links, scoring, and 0.5E shootout visuals preserved


### Ball target calibration and corner accuracy — 0.5E

- Recalibrated all six goal-mouth contacts using ball-radius frame clearance
- Top and lower corner shots now reach the true visual corner pockets
- Separate front-plane contact and deeper net follow-through coordinates
- Corner shots excite side, roof and rear panels with zone-specific weights
- Replay net impact now begins when the ball reaches the goal plane
- Optional **Show targets** overlay displays contact and pocket positions
- Existing camera, goalkeeper anchoring, scoring and email backend preserved

### Camera, keeper anchoring and net sag — 0.5D

- Restored a stronger front-right three-quarter camera angle
- Re-anchored the goalkeeper by the feet on the goal line instead of by the torso
- Increased roof, rear and side-panel resting sag
- Stronger local impact deformation with slower cloth-like settling
- Existing questions, scoring, secret choices and email backend preserved

### Shootout scene reblocking — 0.5C

- Pulled-back penalty-distance camera while preserving the near-right-post oblique view
- Larger foreground striker and larger, deeper goalkeeper
- Longer perspective-correct ball corridor
- World-space pitch markings with thinner, proportionate lines
- Stronger contact shadows and clearer depth separation
- Existing scoring, question flow and volumetric net physics preserved


### Oblique Cinematic Goal and Volumetric Net — 0.5B

- Three-quarter camera based on the selected real-goal reference angle
- Near post projects larger and lower; far post recedes toward the left
- Procedural goal frame with visible depth and rear support bars
- Four simulated net surfaces: back, roof, near side and far side
- Position-based net constraints with natural resting sag
- Local panel-specific impacts and secondary corner ripples
- Ball enters the goal volume, sinks into the net and drops during recoil
- Moving net shadows, frame vibration and stronger replay camera punch
- Projected circular aim/save controls positioned inside the oblique goal
- Net-test toolbar control for fast physics evaluation
- New `shootout-net.mjs` engine and automated stability tests

### Grey-box Shootout Foundation — 0.5A

- New standalone `shootout.html` cinematic prototype
- Four-stage flow: arrival, English challenge, secret aim/dive, animated replay
- Six accessible shot and save zones
- Deterministic answer-gated outcome matrix
- Canvas-drawn placeholder striker and goalkeeper characters
- Cubic Bézier ball flight, spin, squash/stretch, particles, and replay captions
- Original 17 × 9 flat spring-net prototype, now superseded by the 0.5B volumetric cage
- Responsive desktop/mobile layout and reduced-motion control
- Uses the existing Teacher Studio browser question bank
- Pure rule engine in `shootout-core.mjs` with automated tests

Open `/shootout.html` or select **Open cinematic shootout** from the Classroom Demo page.


### Creative Brand Redesign — 0.4

- Illustration-led Teacher Studio with original SVG artwork
- Asymmetrical desktop workspace with offset and overlapping panels
- Expressive display typography and a new creative brand palette
- Layered paper, tape, brush, paperclip, and sticker effects
- Lightweight motion effects with reduced-motion support
- Responsive navigation rail and mobile single-column workflow
- Existing question editing, CSV import, filtering, Mission Control, and email-match hooks preserved

### Existing game and backend features


- Original responsive landing page and game art made with HTML/CSS
- Shared browser-based ELT question bank
- Manual question editor
- CSV import and template download
- JSON export
- Local best-of-five penalty shootout demo (10 alternating kicks)
- Local two-player cartoon turkey fight demo
- Correct-answer streak tracking in Turkey Fight Mail
- Netlify Function scaffold for sending challenge emails through Resend
- Privacy-conscious defaults: no trackers, ads, chat, camera, microphone, or location

## Run locally

The static parts can be opened with any local web server:

```bash
python -m http.server 8888
```

Then open `http://localhost:8888`.

To test the Netlify email function:

```bash
npx netlify dev
```

## Deploy to Netlify

1. Create a GitHub repository and upload this folder.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the repository.
4. Netlify reads `netlify.toml`; no build command is required.
5. Deploy.

## Configure email invitations

MVP 0.8 supports Gmail API as the preferred provider and Resend as an optional fallback. For Gmail API, add these Netlify variables:

- `MAILGAMES_EMAIL_PROVIDER=gmail`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`
- `MAILGAMES_SENDER_NAME=Mail Games ELT`

Use `node scripts/gmail-oauth-helper.mjs` after creating a Google OAuth client to obtain the refresh token. See `docs/GMAIL_API_SETUP_0.6G.md`.

MVP 0.8 can launch protected server-backed matches from Teacher Studio after Mission Control is configured. The current browser question bank is copied into a private match pack, Player A receives the first turn, and each later turn is delivered to the expected player.

## CSV format

```csv
question,type,option_a,option_b,option_c,option_d,answer,explanation,level,tag
"She ___ here since 2023.","multiple-choice","works","worked","has worked","is working","has worked","Use present perfect with since.","B1","Present Perfect"
```

Supported types in this MVP:

- `multiple-choice`
- `true-false`
- `gap-fill`

## Suggested next milestone

1. Test and tune the Turkey Fight move balance, animation timing and mobile layout.
2. Add more fighter skins, arena variations and outcome celebrations without changing the secure turn rules.
3. Add teacher sign-in, ownership policies, and deletion controls.
4. Add classes, class codes and nickname-based student rosters.
5. Add a teacher match dashboard with status, reminders and cancellation.

## Safety and school deployment

Before using this with real students, add the school's required privacy notice, retention controls, account deletion workflow, email consent/approval process, and teacher moderation controls. Use nicknames or class IDs rather than public full names.

## Teacher launch flow (MVP 0.7.1)

Teacher Studio now includes a **Launch an email match** panel. It:

- checks the Netlify Mission Control health endpoint;
- uses the current local question bank as the match pack;
- collects the two player nicknames and approved email addresses;
- creates either a Mail Penalty Shootout or Turkey Fight Mail match;
- sends Player A the first single-use turn link through Gmail API or Resend;
- shows a fallback first-turn link for testing when email is not configured.

Run validation with:

```bash
npm run check
npm test
```

## Design documentation

See `docs/TURKEY_FIGHT_MAIL_0.8.md` for the Turkey Fight milestone, `docs/MATCHDAY_POLISH_0.7.3.md` for the sound/timing milestone, `docs/PRESENTATION_2_5D_0.7.2.md` for the 2.5D milestone, `docs/PHYSICS_NET_0.7.1.md` for the physics milestone, `docs/CINEMATIC_EMAIL_TURNS_0.7.md` for the live email/replay flow, `docs/CREATIVE_BRAND.md` for the visual system, `docs/PENALTY_SHOOTOUT_BLUEPRINT_0.5.md` for the shootout design contract, and `docs/SHOOTOUT_0.5B_IMPLEMENTATION.md` for the oblique goal and net implementation.

## Near-term roadmap

See `docs/PROJECT_ROADMAP.md` for email testing, character art and Turkey Fight Mail milestones.


## 0.6 protected email test

Before launching a real two-inbox test:

1. Run `supabase/migrations/006_email_delivery.sql` in the Supabase SQL editor.
2. Configure the variables shown in `.env.example` through Netlify.
3. Redeploy so Netlify Functions receive the new values.
4. Open Teacher Studio, enter the private test code, and launch a match using only approved recipient addresses.
5. Use **Email delivery recovery** with the match ID if a provider rejects or delays a turn email.

See `docs/EMAIL_TEST_0.6.md` for the full test script.


### Turkey Fight cinematic barn arena — 0.8e

- integrates `assets/turkey-barn-background.jpg` as the default Turkey Fight arena background;
- adds warm sunset overlays, foreground grass depth and drifting dust for a more cinematic farm look;
- improves grounding with longer sunset shadows and a clearer central fight ring;
- keeps the 0.8d/0.8b replay logic, secure email flow and classroom controls intact.


### Penalty scene routing hotfix — 0.8e1

The Turkey fallback layer is now hidden explicitly whenever a Penalty Shootout turn or replay is configured. This prevents the farm/turkey scene from covering the football canvas.


## 0.9F2 penalty replay-layer hotfix

- Cinematic images activate only after a penalty has resolved.
- Goal-zone buttons are hidden throughout replay playback.
- Realistic full-frame striker cuts suppress the old canvas players underneath.
- The interactive turn returns to the coherent original pitch renderer instead of mixing photo stadium layers with cartoon players.
- No database or environment-variable change is required.


## 0.9G1 — Zone-specific penalty trajectories and impacts

- Six visibly different ball trajectories now terminate at the exact selected photographed coordinate.
- Top shots rise more sharply; low shots travel flatter; left and right shots bend in opposite directions.
- The goalkeeper reaction camera follows the stored dive coordinate, including high/low and left/centre/right variants.
- Goal effects deform the upper, lower, side or central net area selected by the striker.
- Saves show a zone-specific glove impact and deflection path.
- Misses now produce bar, over, wide or scuffed-wide outcomes based on the selected coordinate.
- The final realistic result frame preserves the chosen location instead of switching to one generic outcome image.
- No scoring, Gmail, Supabase or Netlify configuration changes are required.


## 0.9G full realistic penalty rebuild

- Replaces the interactive cartoon penalty scene with the positioned realistic striker-and-goalkeeper setup.
- Uses the same six calibrated goal coordinates for striker shots and goalkeeper dives.
- Uses the realistic frame sequence for replay and preserves a realistic result still after playback.
- Removes the old cartoon renderer from the normal penalty draw path rather than covering it temporarily.
- Requires no Supabase migration and no new Netlify environment variable.

## 0.9H2A keeper-view flash hotfix

The goalkeeper replay now cuts directly from the incoming ball to the physical outcome. The remaining full-screen white impact flash, generic radial ball-cam rays, and legacy comic contact bursts are disabled for keeper POV. Match logic and stored coordinates are unchanged.


## 0.9H4A

Locks penalty replay to the uploaded broadcast camera throughout the entire action sequence.


## 0.9H4B

Makes the exact uploaded broadcast camera authoritative by replacing the browser entry/import chain with unique 0.9H4B filenames.
