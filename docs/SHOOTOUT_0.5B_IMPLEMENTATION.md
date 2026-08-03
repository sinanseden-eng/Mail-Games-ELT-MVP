# Shootout 0.5B — oblique goal and volumetric net

This milestone preserves the working 0.5A question, secret-choice, scoring and match-state logic while replacing the straight-on grey-box goal presentation.

## Camera and goal

The scene uses a perspective camera model inspired by the selected three-quarter reference angle:

- the nearest post is on the visual right;
- the nearest post appears larger and lower;
- the far post recedes toward the visual left;
- the roof, near-side, far-side and back net are visible;
- ball targets are calculated in world coordinates and then projected to the canvas.

The reference photograph is not bundled into the website. It is used only as a geometric and compositional reference.

## Volumetric net

`shootout-net.mjs` provides the new net and projection system.

The high-quality configuration contains four independently simulated surfaces:

- back net: 31 × 17 points;
- roof net: 31 × 9 points;
- near-side net: 11 × 17 points;
- far-side net: 11 × 17 points.

Each surface uses:

- structural horizontal and vertical constraints;
- diagonal shear constraints;
- longer bending constraints;
- Verlet integration;
- gravity and velocity damping;
- repeated position-based constraint solving;
- a weak return-to-rest force to avoid numerical drift.

Boundaries remain attached to the frame. Interior nodes begin with small natural slack and sag.

## Impact behaviour

The chosen goal zone determines the first net surface struck:

- upper shots excite the roof net;
- visual-right corner shots excite the near-side net;
- visual-left corner shots excite the far-side net;
- central and lower-middle shots excite the back net;
- corner impacts also send lower-energy motion into the back surface.

The ball travels through the goal mouth before continuing toward the selected net panel. It slows and drops after entering the net. The frame receives a small separate vibration impulse.

## Rendering order

1. sky, clouds, hills and fence;
2. turf and field markings;
3. goal and net shadows;
4. rear frame supports;
5. back/roof/side net surfaces;
6. goalkeeper;
7. ball;
8. foreground strands after goal impact;
9. front posts and crossbar;
10. striker, particles and vignette.

This ordering allows the ball to pass from in front of the goal to inside the net cage.

## Test control

The shootout toolbar includes **Test net**. It applies a full-power impact to the currently selected zone, or top-right when no zone is selected. It is intended for tuning before final character artwork is introduced.

## Files

- `shootout-net.mjs` — camera, 3D projection, frame geometry and net physics
- `shootout.js` — updated oblique replay renderer
- `shootout.css` — larger cinematic layout and projected target buttons
- `tests/shootout-net.test.mjs` — geometry, impact-panel and stability tests

## Validation

```bash
npm run check
npm test
```

The new tests verify that:

- the nearest post projects larger and lower than the far post;
- zones remain inside the front goal frame;
- corner shots excite the expected roof/side surfaces;
- central low shots excite the back net;
- impacts move the net without producing non-finite coordinates.

## Deliberate limitations

- characters remain placeholder canvas figures;
- the goal is rendered procedurally rather than with photorealistic textures;
- the four net surfaces appear connected but do not yet share seam nodes;
- final sound design is not included;
- secure email turns do not yet launch this replay page automatically.

The next art milestone should replace the placeholder striker and keeper only after the new camera angle and net response have been approved on the deployed site.
