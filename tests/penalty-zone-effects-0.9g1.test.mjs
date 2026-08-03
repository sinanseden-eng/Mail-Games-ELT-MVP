import test from "node:test";
import assert from "node:assert/strict";
import {
  PENALTY_ZONE_EFFECTS,
  REALISTIC_SELECTION_POINTS,
  keeperReactionPlan,
  penaltyFlightPoint,
  penaltyImpactPoint,
  penaltyMissPoint,
  penaltyZoneEffect
} from "../penalty-visuals.mjs";

const zones = Object.keys(REALISTIC_SELECTION_POINTS.zones);

test("0.9G1 defines a distinct effect profile for all six penalty coordinates", () => {
  assert.deepEqual(Object.keys(PENALTY_ZONE_EFFECTS).sort(), zones.sort());
  assert.equal(new Set(Object.values(PENALTY_ZONE_EFFECTS).map(effect => `${effect.arc}|${effect.bend}`)).size, 6);
});

test("0.9G1 active shots finish at the exact selected photographed coordinate", () => {
  for (const zoneId of zones) {
    const replay = { shotZone: zoneId, outcome: "goal", kickIndex: 2 };
    const finish = penaltyFlightPoint(replay, 1);
    assert.equal(Math.round(finish.x), REALISTIC_SELECTION_POINTS.zones[zoneId].x);
    assert.equal(Math.round(finish.y), REALISTIC_SELECTION_POINTS.zones[zoneId].y);
  }
});

test("0.9G1 top and bottom choices use visibly different flight heights", () => {
  const top = penaltyFlightPoint({ shotZone: "top-centre", outcome: "goal" }, 0.5);
  const bottom = penaltyFlightPoint({ shotZone: "bottom-centre", outcome: "goal" }, 0.5);
  assert.ok(top.y < bottom.y - 60, `top=${top.y}, bottom=${bottom.y}`);
});

test("0.9G1 left and right choices bend to opposite sides", () => {
  assert.ok(penaltyZoneEffect("top-left").bend < 0);
  assert.ok(penaltyZoneEffect("top-right").bend > 0);
  assert.ok(penaltyZoneEffect("bottom-left").bend < 0);
  assert.ok(penaltyZoneEffect("bottom-right").bend > 0);
});

test("0.9G1 misses preserve the selected direction instead of sharing one endpoint", () => {
  const points = zones.map(zoneId => penaltyMissPoint(zoneId, { kickIndex: 1 }));
  assert.equal(new Set(points.map(point => `${point.x}|${point.y}`)).size, 6);
  assert.ok(penaltyMissPoint("top-centre").y < REALISTIC_SELECTION_POINTS.zones["top-centre"].y);
  assert.ok(penaltyMissPoint("bottom-left").x < REALISTIC_SELECTION_POINTS.zones["bottom-left"].x);
  assert.ok(penaltyMissPoint("bottom-right").x > REALISTIC_SELECTION_POINTS.zones["bottom-right"].x);
});

test("0.9G1 keeper reaction follows the chosen dive side and height", () => {
  assert.deepEqual(keeperReactionPlan("top-left"), { imageIndex: 2, mirror: true, direction: "LEFT", level: "high" });
  assert.deepEqual(keeperReactionPlan("top-right"), { imageIndex: 2, mirror: false, direction: "RIGHT", level: "high" });
  assert.deepEqual(keeperReactionPlan("bottom-centre"), { imageIndex: 4, mirror: false, direction: "CENTRE", level: "low" });
});

test("0.9G1 impact points remain zone-specific for goals and saves", () => {
  for (const outcome of ["goal", "save"]) {
    const points = zones.map(shotZone => penaltyImpactPoint({ shotZone, outcome }));
    assert.equal(new Set(points.map(point => `${point.x}|${point.y}`)).size, 6);
  }
});

test("0.9G1 full realistic zone effects render for all coordinates without runtime errors", async () => {
  const OriginalImage = globalThis.Image;
  globalThis.Image = class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 1280;
      this.naturalHeight = 720;
      this.decoding = "async";
      this.loading = "eager";
    }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  };

  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "arcTo", "beginPath", "clearRect", "clip", "closePath", "drawImage", "ellipse",
    "fill", "fillRect", "fillText", "lineTo", "moveTo", "quadraticCurveTo", "restore",
    "rotate", "roundRect", "save", "scale", "setLineDash", "stroke", "strokeText", "translate"
  ]);
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });

  try {
    const { PenaltyVisualPack } = await import("../penalty-visuals.mjs");
    const pack = new PenaltyVisualPack();
    for (const shotZone of zones) {
      for (const outcome of ["goal", "save", "miss"]) {
        const replay = {
          shotZone,
          keeperZone: outcome === "save" ? shotZone : shotZone === "top-left" ? "bottom-right" : "top-left",
          outcome,
          kickIndex: 3,
          progress: outcome === "save" ? 0.61 : 0.63
        };
        assert.doesNotThrow(() => pack.drawCinematic(ctx, replay, 1000, false));
        assert.doesNotThrow(() => pack.drawResultStill(ctx, replay, 1000));
      }
    }
  } finally {
    if (OriginalImage === undefined) delete globalThis.Image;
    else globalThis.Image = OriginalImage;
  }
});
