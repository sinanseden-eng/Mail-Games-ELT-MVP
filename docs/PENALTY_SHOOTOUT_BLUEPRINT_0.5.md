# Mail Penalty Shootout — Gameplay & Reactive Net Blueprint

**Target milestone:** 0.5 design specification  
**Visual direction:** 2D cartoon characters + 2.5D polish + reactive animated net  
**Primary mode:** asynchronous email turns  
**Secondary mode:** projected classroom play

---

## 1. Product goal

Create a penalty shootout that feels like a small animated sports show rather than a decorated quiz.

The English question determines whether the selected football move is effective:

- **Correct striker answer:** the shot is active.
- **Incorrect striker answer:** the shot is futile and cannot score.
- **Correct goalkeeper answer:** the chosen save is active.
- **Incorrect goalkeeper answer:** the save is late or ineffective.
- **Both correct:** tactical direction decides the result.
- **No random result should override language performance.**

Characters are mechanically equal in the first release. Their differences are visual and expressive, not statistical.

---

## 2. Recommended rendering architecture

Use a hybrid interface:

- **DOM / HTML:** question cards, answer controls, scoreboard, accessibility text, buttons.
- **PixiJS canvas:** characters, ball, goal, net, particles, camera effects and replay.
- **CSS:** page transitions, status cards, responsive layout and reduced-motion mode.
- **Existing Netlify Functions:** authoritative turn and match state.
- **Existing Supabase tables:** persistent match and turn data.

PixiJS should be bundled locally with the project rather than loaded from a public CDN for dependable school-network use.

The shootout scene should use a fixed logical resolution of **1280 × 720**, scaled into its responsive container.

---

## 3. Turn experience

The interface should not show every control simultaneously. Each turn moves through four cinematic screens.

### State A — Match arrival

Purpose: establish context before presenting the question.

Visible:

- match score;
- round number;
- player names or nicknames;
- current role: striker or goalkeeper;
- selected cartoon character;
- previous-round result, when available;
- **Start challenge** button.

Animation:

- character enters or bounces into an idle pose;
- stadium lights switch on;
- crowd and banners move subtly;
- email envelope folds away into the match screen.

Duration: user controlled; entrance animation approximately 500–700 ms.

---

### State B — English challenge

Desktop layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│  Back to match       ROUND 3 OF 5        PLAYER A  2 — 1 PLAYER B │
├───────────────────────────────┬────────────────────────────────────┤
│                               │                                    │
│  CHARACTER ILLUSTRATION       │  QUESTION CARD                     │
│  speech/reaction bubble       │                                    │
│                               │  prompt                            │
│  streak / role badge          │  answer choices                    │
│                               │  explanation after submission      │
│                               │                                    │
│                               │  [SUBMIT ANSWER]                    │
└───────────────────────────────┴────────────────────────────────────┘
```

Mobile layout:

1. compact score header;
2. character bust;
3. question card;
4. answer controls;
5. submit button.

Behaviour:

- The correct answer is checked server-side.
- The browser receives only `correct: true/false`, never the stored answer before submission.
- Correct answer triggers an energetic transition into Aim/Dive mode.
- Incorrect answer still allows a direction choice, but the move is clearly marked **weakened** or **late**.

---

### State C — Aim or dive

The canvas expands to become the main focus.

```text
┌────────────────────────────────────────────────────────────────────┐
│ ROUND 3/5    Player A ●●○○○       Player B ●○○○○      Sound  Pause│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│       STADIUM / CROWD / LIGHTS                                     │
│                                                                    │
│                       ┌──────── GOAL ────────┐                      │
│                       │ TL │ TC │ TR         │                      │
│                       │────┼────┼────        │                      │
│                       │ BL │ BC │ BR         │                      │
│                       └──────────────────────┘                      │
│                               goalkeeper                           │
│                                                                    │
│             striker                 ball                           │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  Correct answer: SHOT ACTIVE       [LOCK TOP RIGHT]                │
└────────────────────────────────────────────────────────────────────┘
```

For the striker:

- six target zones appear over the goal;
- hovering or tapping previews a subtle trajectory;
- the goalkeeper remains in a neutral idle pose;
- the selected target pulses;
- the player confirms with **Lock shot**.

For the goalkeeper:

- the striker’s target is never shown;
- six save zones appear;
- the keeper character leans slightly toward the highlighted zone;
- the player confirms with **Lock save**.

After confirmation:

- the move becomes immutable;
- the secure token is consumed;
- the server either waits for the opponent or resolves the round.

---

### State D — Replay and result

Replay structure:

1. **Anticipation:** 300 ms.
2. **Run-up / keeper ready:** 450–650 ms.
3. **Kick and flight:** 480–650 ms.
4. **Save, miss or net impact:** 250–500 ms.
5. **Character reaction:** 700–1,100 ms.
6. **Result card:** appears after the animation.

Result examples:

- **GOAL — top corner!**
- **SAVED — the keeper read it perfectly.**
- **OFF TARGET — the answer weakened the shot.**
- **TOO LATE — the keeper’s answer made the dive ineffective.**

The result screen shows:

- updated score;
- English explanation;
- compact replay button;
- opponent status;
- next action or “Check your email for the next turn.”

---

## 4. Match rule matrix

Use deterministic outcomes for the first release.

| Striker answer | Keeper answer | Direction comparison | Result |
|---|---|---|---|
| Correct | Correct | Same zone | Save |
| Correct | Correct | Different zone | Goal |
| Correct | Incorrect | Any | Goal |
| Incorrect | Correct | Any | Miss / easy save |
| Incorrect | Incorrect | Any | Miss |

This keeps the rules understandable and makes language performance authoritative.

Possible later enhancement:

- adjacent-zone fingertip saves;
- post hits;
- character abilities;
- power versus placement shots.

Do not include these in 0.5. They add ambiguity before the core loop is proven.

---

## 5. Goal-zone coordinates

Use normalized target coordinates so the scene scales cleanly.

```js
const GOAL_TARGETS = {
  "top-left":      { u: 0.18, v: 0.24 },
  "top-centre":    { u: 0.50, v: 0.20 },
  "top-right":     { u: 0.82, v: 0.24 },
  "bottom-left":   { u: 0.18, v: 0.72 },
  "bottom-centre": { u: 0.50, v: 0.70 },
  "bottom-right":  { u: 0.82, v: 0.72 }
};
```

A turn ID can produce a tiny deterministic visual offset, no more than ±0.025 in `u` or `v`. This creates replay variety without changing the tactical result.

---

## 6. Ball animation

The football follows a cubic Bézier path.

```text
P0 = ball at striker’s foot
P1 = forward lift point
P2 = approach point near the goal
P3 = selected target
```

Recommended timing:

- placed shot: 620 ms;
- power shot visual variant: 490 ms;
- futile shot: 650–800 ms with poor trajectory;
- keeper parry: ball changes direction at glove contact.

Visual polish:

- squash to 92% width at kick;
- stretch to 108% along travel direction;
- subtle spin;
- blurred shadow beneath;
- short speed trail;
- impact flash only on a powerful contact;
- ball scale decreases slightly as it approaches the goal.

The game outcome is resolved before the animation begins. The animation presents the result; it does not calculate it.

---

## 7. Cartoon character system

### Initial roster

Start with two strikers and two goalkeepers.

**Strikers**

1. **Mina Meteor**
   - confident, focused, compact athletic silhouette;
   - comet-shaped motion trail;
   - celebration: spinning finger point.

2. **Bruno Boom**
   - broad, comic-power silhouette;
   - exaggerated run-up;
   - celebration: tiny victory dance.

**Goalkeepers**

1. **Zara Zero**
   - calm, tactical, long glove shapes;
   - clean acrobatic dives;
   - save reaction: dusts off gloves.

2. **Max Magnet**
   - expressive, enthusiastic, slightly chaotic;
   - comic stretch poses;
   - save reaction: hugs the ball.

All four use identical gameplay rules.

### Required animation states

Striker:

- idle;
- ready;
- run-up;
- kick left;
- kick centre;
- kick right;
- celebrate;
- disappointed;
- incorrect-answer stumble.

Goalkeeper:

- idle;
- anticipation;
- dive top-left;
- dive top-right;
- dive bottom-left;
- dive bottom-right;
- centre high;
- centre low;
- catch;
- parry;
- beaten;
- late-dive reaction;
- celebrate.

Use cutout rigs or sprite sheets. A single animation may be mirrored where visually safe.

---

## 8. Scene layers for the 2.5D effect

Render back to front:

1. sky gradient;
2. stadium lights;
3. distant crowd;
4. banners;
5. rear goal-net plane;
6. goal frame;
7. goalkeeper;
8. front net strands where needed;
9. ball;
10. striker;
11. grass foreground;
12. particles and comic captions;
13. DOM controls.

Parallax ranges:

- distant background: 1–2 px;
- crowd and banners: 3–4 px;
- goal: 0 px;
- foreground grass: 5–8 px.

Camera effects:

- 1.025× push-in at run-up;
- 1.045× push-in at kick;
- optional 2–4 px shake on post impact;
- slow return to 1× after result.

Disable parallax, shake and nonessential particles under `prefers-reduced-motion`.

---

# Reactive Net Technical Plan

## 9. Net model

Use a lightweight spring mesh rather than a pre-rendered net animation.

Recommended grid:

- **17 columns × 9 rows**
- 153 nodes;
- horizontal, vertical and diagonal springs;
- boundary nodes attached to the goal frame;
- interior nodes free to deform.

Each node stores:

```js
{
  restX, restY,
  x, y,
  depth,
  vx, vy,
  depthVelocity,
  pinned
}
```

The `depth` value produces the illusion that the ball pushes the net backwards.

---

## 10. Perspective setup

Define the goal opening as a front quadrilateral and the back of the net as a slightly smaller, offset quadrilateral.

```js
const front = {
  tl: { x: 360, y: 150 },
  tr: { x: 920, y: 150 },
  bl: { x: 330, y: 500 },
  br: { x: 950, y: 500 }
};

const rear = {
  tl: { x: 400, y: 175 },
  tr: { x: 880, y: 175 },
  bl: { x: 385, y: 455 },
  br: { x: 895, y: 455 }
};
```

For each normalized net node `(u, v)`:

1. calculate its front-plane rest point by bilinear interpolation;
2. calculate its rear-plane point;
3. use `depth` to interpolate between them;
4. add local `x/y` spring displacement.

```js
screenPoint = lerp(frontPoint, rearPoint, depth);
screenPoint.x += node.x - node.restX;
screenPoint.y += node.y - node.restY;
```

Normal depth is `0`. A ball impact pushes nearby nodes toward `1`, then springs return them to `0`.

---

## 11. Spring connections

Connect each node to:

- left and right neighbours;
- top and bottom neighbours;
- both diagonal neighbours.

Suggested initial constants:

```js
const NET = {
  stiffnessXY: 82,
  stiffnessDepth: 105,
  dampingXY: 0.90,
  dampingDepth: 0.875,
  gravity: 18,
  maxDepth: 0.78
};
```

These are tuning values, not sacred scripture.

The animation loop should:

1. clamp `dt` to a maximum of 1/30 second;
2. apply spring forces;
3. apply damping;
4. update positions;
5. run two solver iterations;
6. render the strands.

A fixed or semi-fixed timestep will make the net consistent across devices.

---

## 12. Impact impulse

When a goal is scored:

```js
net.impact({
  u: target.u,
  v: target.v,
  power: answerCorrect ? 1.0 : 0.35,
  radius: 0.18
});
```

For every node:

```js
distance = normalizedDistance(node.u, node.v, impact.u, impact.v);
falloff = smoothstep(radius, 0, distance);
node.depthVelocity += power * falloff;
node.vx += lateralDirection.x * power * falloff;
node.vy += lateralDirection.y * power * falloff;
```

Recommended behaviour:

- top-corner hit: concentrated ripple with sideways pull;
- central hit: wider backward bowl;
- low hit: smaller ripple plus ball drop;
- post hit, when later implemented: frame vibration but little net displacement.

The ball should continue 12–24 pixels visually into the net, lose speed sharply and drop as the net rebounds.

---

## 13. Net rendering

Draw:

- horizontal strands;
- vertical strands;
- optional diagonal knots;
- a soft net shadow;
- front strands above the ball only when depth ordering requires it.

Use line thickness based on perspective:

- upper/rear strands: 1–1.5 px;
- lower/front strands: 2–2.5 px.

Colour:

- normal: translucent off-white;
- impact highlight: temporary brighter strand colour near the contact point;
- shadow: low-opacity indigo or navy.

Avoid rendering every strand as a DOM or SVG element. A canvas mesh is lighter and easier to animate.

---

## 14. Net state machine

```text
REST
  ↓ goal impact
IMPACT
  ↓ after 80 ms
RECOIL
  ↓ energy below threshold
SETTLE
  ↓
REST
```

Controls:

- net simulation runs at full rate only during replay;
- when idle, update at a reduced frequency or pause;
- force-reset after 2.5 seconds to prevent accumulated numerical drift;
- reset instantly when changing rounds.

---

## 15. Goal-frame response

The frame should have its own small spring value.

On net impact:

- crossbar shift: maximum 1 px;
- post shift: maximum 1.5 px.

On direct post impact in a later release:

- 3–5 px shake;
- metallic sound;
- ball rebound path;
- net receives only a faint secondary ripple.

Do not distort the frame itself. Move the complete frame sprite or container.

---

## 16. Sound design hooks

Prepare event names even before final sounds exist:

```text
stadium_ambience
question_correct
question_incorrect
shot_kick
ball_whoosh
net_snap
keeper_glove
keeper_parry
post_hit
crowd_goal
crowd_save
character_celebrate
```

Sound must default to a reasonable level and have an obvious mute control. Remember the teacher projecting this may not wish to summon a football crowd during the quietest lesson of the week.

---

## 17. Data contract for a round

```js
{
  roundNumber: 3,
  striker: {
    playerId: "...",
    characterId: "mina-meteor",
    answerCorrect: true,
    zone: "top-right"
  },
  keeper: {
    playerId: "...",
    characterId: "zara-zero",
    answerCorrect: true,
    zone: "bottom-right"
  },
  result: {
    outcome: "goal",
    reason: "different-zone",
    target: { u: 0.82, v: 0.24 }
  }
}
```

The server produces `result`. The client receives it and selects the correct replay sequence.

---

## 18. Accessibility and classroom requirements

- keyboard-selectable target zones;
- clear visible focus;
- text labels in addition to colour;
- captions for all result animations;
- mute control;
- reduced-motion mode;
- no flashing above safe accessibility thresholds;
- goal-zone buttons at least 44 × 44 CSS pixels;
- readable projected mode at 1280 × 720;
- mobile portrait mode with question and action stages stacked;
- replay can be skipped without losing the result.

---

## 19. Performance budget

Target:

- 60 fps on an ordinary school laptop;
- 30 fps minimum on older tablets;
- initial shootout assets below 3 MB compressed;
- one character pair loaded per match;
- lazy-load celebration animations;
- use WebP/AVIF for static backgrounds;
- use sprite atlases for character frames;
- pool particles rather than continually creating objects;
- pause animation when the tab is hidden.

---

## 20. Build sequence

### Sprint 1 — Grey-box scene

- 1280 × 720 stage;
- six goal zones;
- placeholder striker and keeper;
- deterministic ball paths;
- result states;
- DOM question-to-aim transition.

### Sprint 2 — Reactive net

- 17 × 9 spring mesh;
- perspective projection;
- impact impulses;
- settle/reset logic;
- frame vibration;
- net performance tests.

### Sprint 3 — Character animation

- one striker;
- one goalkeeper;
- complete state machines;
- mirrored variants;
- reaction timing.

### Sprint 4 — Mail-game integration

- consume existing turn token;
- submit question answer and zone;
- waiting state;
- server result;
- replay from resolved round;
- email next-turn flow.

### Sprint 5 — Art and polish

- full initial roster;
- stadium layers;
- particles;
- camera punch;
- captions;
- sound hooks;
- reduced-motion mode.

---

## 21. Acceptance criteria for the first playable build

The build is ready for testing when:

- a striker can answer and lock one of six zones;
- a goalkeeper can answer and secretly lock one of six zones;
- the backend deterministically resolves the round;
- the replay always matches the server result;
- a goal visibly deforms the net at the correct contact point;
- the net returns to rest without jitter;
- a save contacts the goalkeeper rather than the net;
- a futile shot cannot score;
- keyboard and touch controls work;
- reduced-motion mode remains fully playable;
- a complete five-round match can continue through secure email links.

---

## 22. Explicitly out of scope for 0.5

- full 3D characters;
- free-aim mouse shooting;
- character statistics;
- purchasable upgrades;
- random outcome modifiers;
- complex post and crossbar physics;
- online real-time multiplayer;
- open student chat;
- public profiles.

The first goal is a charming, deterministic, teachable shootout—not FIFA wearing a grammar worksheet as a hat.
