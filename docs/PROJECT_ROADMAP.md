# Mail Games ELT — near-term roadmap

## 0.6G — Gmail two-inbox delivery — complete

- Supabase match persistence, signed single-use turns and answer-gated moves work end to end.
- Gmail API delivery has been verified with Player A and Player B in separate inboxes.
- Resend remains an optional fallback.

## 0.7 — Cinematic email turns and result replays — complete

- keep the calibrated pitch visible while players answer and choose directions;
- conceal the striker's target from the goalkeeper's browser response;
- play the resolved penalty immediately on the goalkeeper's screen;
- email the striker a signed **Watch the penalty** replay link;
- keep result notification separate from the next gameplay turn;
- show score and English-answer review after the animation.

No database migration or new environment variable is required for 0.7.

## 0.7.1 — Ball physics and sagging-net polish — complete

- deterministic flight profiles for all six shot zones;
- rising, dipping and curving trajectories with visible spin;
- perspective-correct ball size, speed trail and pitch shadow;
- keeper contact, deflection and landing motion;
- goal-pocket follow-through and ball settling;
- stronger resting sag and delayed secondary net ripples;
- server-authoritative outcomes preserved.

No database migration or new environment variable is required for 0.7.1.

## 0.7.2 — 2.5D character and object upgrade — complete

- layered striker and goalkeeper rigs with depth-aware limbs;
- stronger anticipation, follow-through, dive and reaction poses;
- dimensional goal frame, turf, shadows and stadium layers;
- consistent visual treatment across turn and replay pages.

## 0.7.3 — Matchday sound, timing and celebrations — complete

- locally synthesized whistle, boot, glove, net and crowd cues;
- sound preference and explicit replay play gesture;
- clearer anticipation, strike, impact and result timing;
- distinct goal, save and miss banners and particles;
- striker and goalkeeper late-result reactions;
- reduced-motion support and existing scoring preserved.

No database migration, external audio asset or new environment variable is required for 0.7.3.

## 0.8 — Turkey Fight Mail email game — complete

Turkey Fight Mail now reuses the completed football email/replay infrastructure:

- Teacher Studio question packs and answer checking;
- signed single-use fighter turn links;
- Gmail delivery and recipient allowlisting;
- Supabase match persistence;
- signed result replays;
- immediate second-player result animation.

The first dedicated Turkey milestone adds:

- a procedural 2.5D farm arena and two layered cartoon fighters;
- six attack and defence moves with a deterministic counter matrix;
- concealed first-player move state;
- health, damage, streak and winner presentation;
- a **Watch the fight** result email for Fighter A;
- shared live-turn and replay rendering;
- synthesized fight cues and reduced-motion-safe timing.

No database migration, external asset pack or new environment variable is required for 0.8.

## 0.8b — Turkey Fight close-combat presentation — completed

- move both fighters into a readable foreground combat distance;
- synchronize defensive poses with incoming attacks;
- align maximum lunge extension with the authoritative impact beat;
- add restrained camera push and impact shake without changing game results.

## 0.8.1 — Turkey Fight balance and presentation polish — proposed

- tune damage values and counter readability after classroom testing;
- improve mobile animation framing and result timing;
- add fighter skins, arena variations and richer celebrations;
- preserve deterministic, server-authoritative outcomes.

## Later school-readiness milestones

- teacher authentication and ownership policies;
- classes, class codes and nickname rosters;
- match dashboard, reminders and cancellation;
- privacy notices, retention and deletion controls;
- question analytics and tournament tools.

## Current checkpoint — 0.8b

The football game remains the stable flagship. Turkey Fight Mail now has a visible arena, foreground fighters and contact-timed close-combat choreography while retaining the secure two-inbox turn and replay system. The next target is classroom balancing and presentation polish before account and class-management work.

## 0.9A — Sniper Elite secure prediction foundation — completed

- third Teacher Studio game type and protected email launch;
- four emergence positions and four prediction targets;
- concealed Player A choices until Player B submits;
- three-point health system with a five-round maximum;
- wrong answers preserve cover selection but disable the training shot;
- simultaneous non-graphic training tags;
- signed result replay email for Player A;
- mountain-village live-turn and replay scene;
- Supabase game-type migration `007_sniper_game.sql`.

## 0.9B — Sniper Elite cinematic action pass — completed

- depth-scaled tactical characters at all four emergence positions;
- emergence, aim, recoil and clean hit-reaction animation;
- visible travelling tracer rounds with muzzle flash;
- separate shot and impact timing for Player A and Player B;
- environmental dust and debris when a prediction misses;
- strong non-bloody vest impact and final drop-behind-cover response;
- generated gunshot, trigger-click and impact audio;
- no backend, database or concealment changes.

## 0.9C — Sniper Elite hybrid scope camera pass — completed

- wide establishing view followed by separate Player A and Player B scope POV sequences;
- scope housing, reticle, breath sway, range marks and foreground rifle silhouette;
- camera focus driven by the stored prediction and authoritative hit/miss result;
- recoil, tracer travel and target-reaction camera cuts;
- pause/resume and skip-to-result controls on immediate and signed replays;
- synthesized scope-focus cue with no downloaded audio;
- reduced-motion and all existing server-authoritative rules preserved;
- no database, Gmail, token or concealment changes.

## Current checkpoint — 0.9C

Penalty Shootout and Turkey Fight remain intact. Sniper Elite now combines its tested secret-choice engine with a hybrid cinematic replay: wide tactical context, first-person scope shots and readable non-graphic impact reactions. The next useful step is live desktop/mobile timing feedback before adding new gameplay systems.
