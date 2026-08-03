import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { REALISTIC_SELECTION_POINTS } from "../penalty-visuals.mjs";
import { ZONES } from "../shootout-core.mjs";

test("0.9G calibrates all six interactive zones to the photographed goal mouth", () => {
  assert.deepEqual(Object.keys(REALISTIC_SELECTION_POINTS.zones).sort(), ZONES.map(zone => zone.id).sort());
  for (const point of Object.values(REALISTIC_SELECTION_POINTS.zones)) {
    assert.ok(point.x > 100 && point.x < 1180);
    assert.ok(point.y > 100 && point.y < 430);
  }
});

test("0.9G renders realistic striker and goalkeeper positioning before any replay exists", async () => {
  const visuals = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const scene = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  assert.match(visuals, /drawSelection\(ctx/);
  assert.match(visuals, /this\.assets\.striker\[0\]/);
  assert.match(visuals, /GOALKEEPER VIEW/);
  assert.match(visuals, /STRIKER VIEW/);
  assert.match(scene, /REALISTIC_SELECTION_POINTS\.zones/);
});

test("0.9G has a non-cartoon loading state rather than exposing legacy actors", async () => {
  const visuals = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  assert.match(visuals, /Loading the realistic stadium/);
  assert.match(visuals, /drawLoadingFrame/);
});

test("0.9G bottom-zone ball flight uses the canonical bottom ids", async () => {
  const visuals = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(visuals, /"low-left"/);
  assert.doesNotMatch(visuals, /"low-right"/);
  assert.match(visuals, /targets\[replay\.shotZone\]/);
});
