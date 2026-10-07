# Football replay integration

The classroom app, Penalty Club practice, local two-player shootout and current email turn/replay pages share `football-player.mjs`. It preserves the existing replay clock and controls, then lazily loads the Three.js view. All outcome resolution and scoring stay in the existing game engine and classroom service.

## Behavior

- Fixed sideline TV angle; goal on the left, shooter on the right. The camera stays at 16:9 on phones.
- The shooter approaches 1.2 m using the supplied Running clip, blends into a planted kick and releases the ball at the existing 0.92-second cue. Idle, running and kick poses are evaluated deterministically for seeking and replay.
- Canonical left/right are from behind the shooter. A left target is the keeper's own right. Keeper movement follows the independently chosen keeper zone, not the shot zone.
- Active matching choices catch the ball at the actual glove midpoint in front of the goal line. The ball follows the hands through landing. Centre targets use a vertical reach or low crouch rather than a side dive.
- A wrong keeper answer delays the attempted save. A wrong shooter answer produces a wide shot. Goals, saves and misses follow the saved server result; replay collisions cannot change scores.
- Practice also supports parries, which deflect away from the goal.
- Goal depth is 1.8 m, with one-pixel net strands at 18% opacity, fewer strands, static roof/back sag and impact deformation. The 2D fallback also uses finer, fainter strands. The practice tension control adjusts sag.
- Reduce motion, pause, speed, skip, replay cancellation and audio events retain their existing behavior. Idle 3D frames render only when changed.
- Models are separate, same-origin GLBs totaling about 3.5 MB. Login, answering and score updates never wait for the model download.
- Replay playback waits for the players or the 2D fallback, and warms the starting frame before its 4.2-second clock begins. A rendering stall or background-tab suspension advances at most 0.25 seconds on the next frame, preserving the visible kick and flight. Pending replays can still be skipped or cancelled during loading.
- Classroom football exposes Full animation / Reduced motion and Normal / Half speed controls. The motion choice persists on the device; an explicit Full animation choice overrides the system preference. A waiting player's polling update automatically plays a newly completed round, including the final penalty, without replaying old rounds on unrelated updates.
- If WebGL, a download or rendering fails, the existing 2D scene remains playable. `?football2d` explicitly selects it. Scene destruction releases GPU resources and cancels replay promises.

## Validation

`npm run check`, `npm test`, `npm run build`.

Automated rule tests exercise all 144 combinations of six shot choices, six keeper choices and both answer-activation flags. Browser verification covers all nine practice catches, real glove attachment, goal-line clearance, skin bounds, pause/skip/repeated replay, mobile layout and forced 2D playback. The teacher/student browser journey uses mocked confirmed Identity accounts and the actual classroom service with an in-memory store: teacher activation, class/roster creation, student joining codes, question pool, assignment, 20 student turns, role changes, goals/saves/weakened moves and final teacher results. It sends no emails or push notifications.

The remaining classroom release gate is unchanged: one deployed match with a real teacher and two confirmed students, account-recovery delivery, and opt-in notification delivery on a supported phone. Local tests do not verify these providers or physical devices. Keep the classroom branch on its isolated preview until those checks pass.
