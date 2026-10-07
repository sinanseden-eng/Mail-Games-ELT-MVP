import {
  replaySnapshot,
  TIMING,
  targetFor,
  clamp,
} from "../football-motion.mjs";

export const GOAL_LINE = -5.5;
export const NET_DEPTH = 1.8;
export const BALL_RADIUS = 0.11;
// The painted spot and every stationary ball frame share one pitch position.
export const BALL_START = Object.freeze({ x: 0, y: BALL_RADIUS, z: GOAL_LINE + 11 });
export function zonePoint(id) {
  const { id: zone } = targetFor(id);
  const [row, column] = zone.split("-");
  return {
    x: column === "left" ? -2.8 : column === "right" ? 2.8 : 0,
    y: row === "top" ? 2.06 : row === "middle" ? 1.25 : 0.32,
    z: GOAL_LINE,
  };
}
// Read the saved server result. Renderer collisions never award or remove points.
export function replayPlan(round) {
  const data = replaySnapshot(round);
  const shot = zonePoint(data.shotZone),
    keeper = zonePoint(data.keeperZone);
  const stopped = ["save", "parry"].includes(data.outcome);
  return {
    data,
    shot,
    keeper,
    stopped,
    catch: data.outcome === "save",
    keeperSide: keeper.x < 0 ? "right" : "left",
    centre: keeper.x === 0,
    low: keeper.y < 0.5,
    late: data.keeperActive ? 0 : 0.3,
    contact: stopped
      ? { ...shot, z: -4.61 }
      : data.outcome === "miss"
        ? { ...shot, x: shot.x < 0 ? -4.4 : 4.4, y: Math.max(0.6, shot.y) }
        : shot,
  };
}
export function keeperTime(time, plan) {
  return (
    (Math.max(0, time - TIMING.kick - plan.late) * 0.65) /
    (TIMING.contact - TIMING.kick)
  );
}
export function ballPosition(
  plan,
  time,
  contact = plan.contact,
  gloves = contact,
) {
  const u = clamp((time - TIMING.kick) / (TIMING.contact - TIMING.kick));
  const p = {
    x: BALL_START.x + (contact.x - BALL_START.x) * u,
    y:
      BALL_RADIUS + (contact.y - BALL_RADIUS) * u + 0.2 * Math.sin(Math.PI * u),
    z: BALL_START.z + (contact.z - BALL_START.z) * u,
  };
  if (time < TIMING.contact) return p;
  if (plan.catch) return { ...gloves };
  const age = time - TIMING.contact;
  if (plan.data.outcome === "parry") {
    const side = plan.shot.x < 0 ? -1 : 1;
    return {
      x: contact.x + side * Math.min(age, 1.8) * 2.6,
      y: Math.max(BALL_RADIUS, contact.y + age * 0.5 - age * age * 2),
      z: contact.z + Math.min(age, 1.8) * 3.2,
    };
  }
  if (plan.data.outcome === "miss")
    return {
      x: contact.x + Math.min(age, 1.5) * (contact.x < 0 ? -1 : 1),
      y: Math.max(BALL_RADIUS, contact.y - age * 1.8),
      z: contact.z - Math.min(age, 1.5) * 4,
    };
  return {
    x: contact.x,
    y: Math.max(BALL_RADIUS, contact.y - age * 1.2),
    z:
      GOAL_LINE -
      Math.min(age / (TIMING.net - TIMING.contact), 1) * (NET_DEPTH + 0.04),
  };
}
