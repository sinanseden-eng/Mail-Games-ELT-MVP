import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { REPLAY_TIMELINE } from "../shootout-physics.mjs";
import {
  PENALTY_VISUAL_ASSETS,
  penaltyVisualFramePlan
} from "../penalty-visuals.mjs";

test("0.9F visual plan uses realistic establishment and five-stage striker motion", () => {
  const establish = penaltyVisualFramePlan(0.03, "goal");
  assert.equal(establish.fullFrame, "establishing");
  assert.ok(establish.fullOpacity > 0.6);

  const setup = penaltyVisualFramePlan(0.08, "goal");
  const contact = penaltyVisualFramePlan(REPLAY_TIMELINE.strike, "goal");
  const follow = penaltyVisualFramePlan(REPLAY_TIMELINE.strike + 0.04, "goal");
  assert.equal(setup.fullFrame, "striker");
  assert.ok(contact.strikerIndex >= 3, `contact frame=${contact.strikerIndex}`);
  assert.ok(follow.strikerIndex >= contact.strikerIndex);
});

test("0.9F keeps physics visible after the realistic kick cut", () => {
  const flight = penaltyVisualFramePlan(REPLAY_TIMELINE.strike + 0.10, "goal");
  assert.equal(flight.fullFrame, null);
  assert.equal(flight.fullOpacity, 0);
  assert.equal(flight.phase, "ball-flight");
});

test("0.9F provides outcome-specific impact cameras", () => {
  for (const outcome of ["goal", "save", "miss"]) {
    const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
    const plan = penaltyVisualFramePlan(contact + 0.025, outcome);
    assert.equal(plan.outcome, outcome);
    assert.ok(plan.outcomeOpacity > 0.25, `${outcome} opacity=${plan.outcomeOpacity}`);
  }
});

test("0.9F generated visual assets are packaged", async () => {
  const paths = [
    PENALTY_VISUAL_ASSETS.environment.crowd,
    PENALTY_VISUAL_ASSETS.environment.pitch,
    PENALTY_VISUAL_ASSETS.establishing,
    ...PENALTY_VISUAL_ASSETS.striker,
    ...PENALTY_VISUAL_ASSETS.keeper,
    ...Object.values(PENALTY_VISUAL_ASSETS.outcome)
  ];
  for (const relative of paths) {
    const url = new URL(relative.replace(/^\.\//, "../"), import.meta.url);
    await access(url, constants.R_OK);
  }
});

test("0.9G uses the realistic pack for both selection and resolved replay frames", async () => {
  const source = await readFile(new URL("../shootout-scene.mjs", import.meta.url), "utf8");
  assert.match(source, /new PenaltyVisualPack\(\)/);
  assert.match(source, /visualPack\.drawSelection/);
  assert.match(source, /visualPack\.drawCinematic/);
  assert.match(source, /visualPack\.drawResultStill/);
  assert.doesNotMatch(source, /visualPack\.drawEnvironment\(ctx, time\)/);
  assert.doesNotMatch(source, /visualPack\.drawPitchTexture/);
});
