import { TIMING } from "../football-motion.mjs";
import { BALL_START } from "./motion.mjs";

const clamp = (v) => Math.max(0, Math.min(1, v));
export const SOURCE_KICK_CONTACT = 0.52;
// Keep ball release and the keeper's response on the shared replay clock.
// The final 120 ms of the approach blends running into the kicking plant.
export function shooterFrame(time, playing = true) {
  const t = playing ? Math.max(0, time) : 0;
  const kickWeight = clamp((t - 0.44) / 0.12);
  const idleWeight = 1 - clamp(t / 0.08);
  const approach = t <= 0.44
    ? t / 0.5
    : 0.88 + 0.12 * (1 - (1 - clamp((t - 0.44) / 0.12)) ** 2);
  return {
    z: BALL_START.z + 1.8 - 1.2 * Math.min(1, approach),
    idleWeight,
    runWeight: Math.max(0, 1 - idleWeight - kickWeight),
    kickWeight,
    runTime: t * 1.45,
    kickTime: t < TIMING.kick
      ? SOURCE_KICK_CONTACT * clamp((t - 0.44) / (TIMING.kick - 0.44))
      : SOURCE_KICK_CONTACT + (t - TIMING.kick),
  };
}

export function poseShooter(actor, time, playing) {
  const frame = shooterFrame(time, playing);
  actor.group.position.z = frame.z;
  // Source boot soles extend below the rig's nominal floor during these clips.
  actor.group.position.y = frame.runWeight * 0.075 + frame.kickWeight * 0.025;
  for (const [name, weight, localTime] of [
    ["idle", frame.idleWeight, 0],
    ["run", frame.runWeight, frame.runTime],
    ["kick", frame.kickWeight, frame.kickTime],
  ]) {
    const action = actor.actions[name];
    action.setEffectiveWeight(weight);
    action.time = name === "run"
      ? localTime % action.getClip().duration
      : Math.min(action.getClip().duration - 0.00001, localTime);
  }
  // Explicit action times make pause, seeking and repeated playback identical.
  actor.mixer.update(0);
  actor.root.updateMatrixWorld(true);
  return frame;
}
