import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { keeperCameraFrame } from "../shootout-cinematics.mjs";

test("0.9H2A keeper camera requests no generic flash or radial ball cam", () => {
  const frame = keeperCameraFrame({
    progress: 0.64,
    outcome: "goal",
    keeperTarget: { x: 880, y: 470 }
  });
  assert.equal(frame.impactOpacity, 0);
  assert.equal(frame.ballCamOpacity, 0);
});

test("0.9H2A removes the full-screen white keeper POV flash", async () => {
  const source = await readFile(new URL("../penalty-visuals.mjs", import.meta.url), "utf8");
  const keeperWorld = source.slice(
    source.indexOf("  drawKeeperPovWorld(ctx"),
    source.indexOf("\n  drawKeeperPovBackground(ctx")
  );
  assert.doesNotMatch(keeperWorld, /impactFlash/);
  assert.doesNotMatch(keeperWorld, /fillStyle = ["']white["']/);
  assert.match(keeperWorld, /No white\s+\/\/|No white|No white/);
});

test("0.9H2A suppresses legacy comic contact effects in keeper fallback", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  const contact = source.slice(
    source.indexOf("  drawContactDetail(ctx"),
    source.indexOf("\n  drawOverShoulderView(ctx")
  );
  const presentation = source.slice(
    source.indexOf("  drawCameraPresentation(ctx"),
    source.indexOf("\n  drawCinematicOverlay(ctx")
  );
  assert.match(contact, /keeperView \? 0 : kickContactEnvelope/);
  assert.match(contact, /keeperView \? 0 : impactEnvelope/);
  assert.match(presentation, /replay\.viewerRole !== PENALTY_VIEWERS\.KEEPER/);
});
