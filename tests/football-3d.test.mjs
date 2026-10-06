import test from "node:test";
import assert from "node:assert/strict";
import {
  replayPlan,
  ballPosition,
  keeperTime,
  zonePoint,
  GOAL_LINE,
  BALL_RADIUS,
} from "../football-3d/motion.mjs";
import { TIMING } from "../football-motion.mjs";
import { PENALTY_MOVES, resolvePenaltyResult } from "../game-engine.mjs";
import { ShootoutScene } from "../football-player.mjs";
import { shooterFrame, SOURCE_KICK_CONTACT } from "../football-3d/shooter.mjs";

test("the shooter approaches, plants and kicks on the shared ball-release clock", () => {
  const idle = shooterFrame(3, false);
  assert.equal(idle.z, 6.5);
  assert.equal(idle.idleWeight, 1);
  let z = idle.z;
  for (let t = 0; t <= TIMING.end; t += 0.01) {
    const frame = shooterFrame(t);
    assert.ok(frame.z <= z + 1e-10);
    assert.ok(frame.z >= 5.3 - 1e-10);
    assert.ok(Math.abs(frame.idleWeight + frame.runWeight + frame.kickWeight - 1) < 1e-10);
    if (t >= 0.56) assert.ok(Math.abs(frame.z - 5.3) < 1e-10);
    z = frame.z;
  }
  assert.equal(shooterFrame(0.25).runWeight, 1);
  assert.equal(shooterFrame(TIMING.kick).kickTime, SOURCE_KICK_CONTACT);
  assert.equal(shooterFrame(TIMING.kick).kickWeight, 1);
});

test("all 144 server-rule combinations preserve choices, score outcomes and goal-line clearance", () => {
  for (const shotZone of PENALTY_MOVES)
    for (const keeperZone of PENALTY_MOVES)
      for (const shotActive of [true, false])
        for (const keeperActive of [true, false]) {
          {
            const round = Object.freeze({
              shotZone,
              keeperZone,
              shotActive,
              keeperActive,
              ...resolvePenaltyResult({
                shotZone,
                keeperZone,
                shotActive,
                keeperActive,
              }),
            });
            const before = JSON.stringify(round),
              plan = replayPlan(round);
            assert.deepEqual(plan.keeper, zonePoint(keeperZone));
            assert.deepEqual(plan.shot, zonePoint(shotZone));
            assert.equal(plan.catch, round.outcome === "save");
            assert.equal(plan.data.outcome, round.outcome);
            if (round.outcome === "save") {
              const gloves = { x: plan.shot.x, y: plan.shot.y, z: -4.61 };
              for (const t of [TIMING.contact, 2.32, TIMING.end]) {
                const b = ballPosition(plan, t, gloves, gloves);
                assert.deepEqual(b, gloves);
                assert.ok(b.z - BALL_RADIUS > GOAL_LINE);
              }
            } else {
              const b = ballPosition(plan, TIMING.end);
              if (round.goal) {
                assert.ok(b.z + BALL_RADIUS < GOAL_LINE);
                assert.ok(Math.abs(b.x) + BALL_RADIUS < 3.66);
              } else assert.ok(Math.abs(b.x) - BALL_RADIUS > 3.66);
            }
            if (!keeperActive)
              assert.equal(keeperTime(TIMING.kick + 0.2, plan), 0);
            assert.equal(JSON.stringify(round), before);
          }
        }
});
test("a parry travels forward away from the goal, rather than being held or entering the net", () => {
  const plan = replayPlan({
    shotZone: "top-left",
    keeperZone: "top-left",
    outcome: "parry",
  });
  const at = ballPosition(plan, TIMING.contact),
    later = ballPosition(plan, TIMING.contact + 0.5);
  assert.ok(later.z > at.z);
  assert.ok(later.x < at.x);
  assert.equal(plan.catch, false);
});
test("the fallback preserves pause, cancellation and exactly one result without WebGL", async () => {
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  const gradient = { addColorStop() {} },
    ctx = new Proxy(
      {},
      { get: (_, k) => (k.startsWith("create") ? () => gradient : () => {}) },
    );
  const scene = new ShootoutScene(
    { getContext: () => ctx, setAttribute() {} },
    null,
  );
  assert.equal(await scene.ready, false);
  const pending = scene.playReplay({
    shotZone: "top-left",
    keeperZone: "bottom-right",
    outcome: "goal",
  });
  scene.updateReplay(0.3);
  scene.togglePause();
  scene.updateReplay(9);
  assert.equal(scene.replay.elapsed, 0.3);
  scene.skipReplay();
  assert.deepEqual(await pending, { cancelled: false });
  assert.equal(scene.resultStill.outcome, "goal");
  const cancelled = scene.playReplay({ outcome: "save" });
  scene.destroy();
  assert.deepEqual(await cancelled, { cancelled: true });
});
