import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("0.9H4C pages load the calibrated broadcast chain", async () => {
  const [turn, replay, demo] = await Promise.all([read("turn.html"), read("replay.html"), read("shootout.html")]);
  assert.match(turn, /(?:turn-0\.9h4(?:c|d)\.js|turn-0\.9h5(?:a1?)?\.js)/);
  assert.match(replay, /(?:replay-0\.9h4(?:c|d)\.js|replay-0\.9h5(?:a1?)?\.js)/);
  assert.match(demo, /(?:shootout-0\.9h4(?:c|d)\.js|shootout-0\.9h5(?:a1?)?\.js)/);
});

test("0.9H4C keeps all six choices inside the broadcast goalmouth", async () => {
  const module = await import(new URL("../penalty-visuals-0.9h4c.mjs", import.meta.url));
  const points = module.BROADCAST_SELECTION_POINTS;
  for (const [id, point] of Object.entries(points.zones)) {
    assert.ok(point.x >= 28 && point.x <= 444, `${id} x is inside goal`);
    assert.ok(point.y >= 267 && point.y <= 515, `${id} y is inside goal`);
  }
  assert.ok(points.ball.x > 850 && points.ball.y > 480);
});

test("0.9H4C selection and replay use separate plates from the same camera", async () => {
  const visuals = await read("penalty-visuals-0.9h4c.mjs");
  assert.match(visuals, /broadcast-selection-0\.9h4c\.png/);
  assert.match(visuals, /broadcast-action-0\.9h4c\.png/);
  const selection = visuals.slice(visuals.indexOf("drawSelection("), visuals.indexOf("drawLoadingFrame("));
  assert.match(selection, /selectionBackground/);
  const cinematic = visuals.slice(visuals.indexOf("drawSingleAngleCinematic("), visuals.indexOf("drawSingleAngleKeeper("));
  assert.match(cinematic, /One uninterrupted broadcast plate/);
  assert.doesNotMatch(cinematic, /drawMotionMatchedFullFrame/);
  assert.doesNotMatch(cinematic, /this\.assets\.striker\[/);
  for (const file of ["broadcast-selection-0.9h4c.png", "broadcast-action-0.9h4c.png"]) {
    const info = await stat(new URL(`../assets/penalty-single-angle/${file}`, import.meta.url));
    assert.ok(info.size > 300_000);
  }
});

test("0.9H4C moves taker, ball and keeper inside the broadcast geometry", async () => {
  const module = await import(new URL("../penalty-visuals-0.9h4c.mjs", import.meta.url));
  const replay = { outcome: "goal", shotZone: "top-right", keeperZone: "bottom-left", kickIndex: 1 };
  const before = module.singleAngleBallState(replay, 0.2);
  const after = module.singleAngleBallState(replay, 0.7);
  assert.equal(before.visible, false);
  assert.equal(after.visible, true);
  assert.ok(after.x < before.start.x);
  const keeper = module.singleAngleKeeperState(replay, 0.7);
  assert.ok(keeper.diveT > 0);
  assert.equal(keeper.zoneId, "bottom-left");
});
