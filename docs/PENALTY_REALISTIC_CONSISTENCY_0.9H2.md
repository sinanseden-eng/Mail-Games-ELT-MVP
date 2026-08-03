# Penalty Shootout 0.9H2 — Realistic Impact and Perspective Consistency

## Purpose

0.9H2 refines the 0.9H1 dual-perspective replay without changing match rules or server outcomes. It addresses:

- cartoon-like ball/net/save impact effects;
- the final main-camera frame occasionally showing the mirrored keeper-side target.

## Canonical event contract

The server result remains authoritative:

```js
{
  shotZone: "bottom-left",
  keeperZone: "bottom-right",
  outcome: "goal"
}
```

At replay creation, the scene creates a local canonical snapshot:

```js
{
  shotZone: "bottom-left",
  keeperZone: "bottom-right",
  canonicalShotZone: "bottom-left",
  canonicalKeeperZone: "bottom-right",
  viewerRole: "keeper"
}
```

Camera transformations are display-only:

```text
Keeper POV:  bottom-left → visually bottom-right
Main camera: bottom-left → bottom-left
```

`zoneForCamera()` always starts from `canonicalShotZone` or `canonicalKeeperZone`. It never mutates the event.

## Rendering changes

- realistic radial shading for the ball;
- thinner panel seams and reduced glow;
- one very faint motion ghost only;
- localized, low-opacity net-strand deformation;
- soft ball shadow and short settling movement inside the net;
- subtle glove compression and physical deflection;
- small grass flecks instead of radial turf rays;
- restrained post/crossbar glint instead of an orange burst.

## Main-camera correction

`drawKeeperLookBack()` now requests the target with:

```js
zoneForCamera(replay, {
  field: "shotZone",
  cameraRole: PENALTY_VIEWERS.STRIKER
});
```

The keeper POV continues to use:

```js
zoneForCamera(replay, {
  field: "shotZone",
  cameraRole: PENALTY_VIEWERS.KEEPER
});
```

This separates physical match coordinates from viewer-space coordinates.

## Data and deployment impact

- no Supabase schema change;
- no token format change;
- no Gmail flow change;
- no scoring change;
- no Turkey Fight or Sniper Elite change;
- no new external media dependency.

## Regression protection

The 0.9H2 test suite verifies:

- canonical replay snapshots do not mutate server events;
- all six zones mirror only in keeper POV;
- main-camera coordinates restore the canonical side;
- canonical fields win even if a display field is accidentally altered;
- repeated rendering does not alternate the target;
- realistic impact methods contain no previous neon/radial burst implementation;
- all six goal zones render in both perspectives without exceptions.
