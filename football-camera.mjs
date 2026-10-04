import { FIELD, TIMING, TARGETS, clamp, lerp, smooth, targetFor, keeperPose, netBase, netPoint } from './football-motion.mjs';

// A fixed elevated sideline camera. u runs across the goal, d runs out onto
// the pitch (the penalty spot is d=1), and h is a fraction of goal height.
// This is a Canvas 2D projection, with no model, camera library or 3D assets.
export const NET_DEPTH = -.23;
export function projectPitch(u, d = 0, h = 0) {
  const perspective = 1 + .135 * u - .035 * d;
  return { x: (188 + 358 * u + 596 * d) / perspective,
    y: (513 - 10 * u + 25 * d - 181 * h) / perspective };
}
export function projectGoalPoint(point) {
  return projectPitch((point.x - FIELD.left) / (FIELD.right - FIELD.left), 0,
    (FIELD.bottom - point.y) / (FIELD.bottom - FIELD.top));
}
export const TV_BALL_START = Object.freeze({ ...projectPitch(.5, 1, .042), r: 7.4 });
export const TV_TARGETS = Object.freeze(TARGETS.map(t => Object.freeze({ ...t, ...projectGoalPoint(t) })));
export function targetAtScreen(x, y) {
  const u = (188 - x) / (.135 * x - 358);
  const h = (513 - 10 * u - y * (1 + .135 * u)) / 181;
  if (u < -.04 || u > 1.04 || h < -.06 || h > 1.06) return null;
  return [...TV_TARGETS].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
}
export function tvKeeperPose(round, time) {
  return Object.fromEntries(Object.entries(keeperPose(round, time)).map(([key, point]) => [key, projectGoalPoint(point)]));
}
export function tvNetPoint(u, v, round, time, sag = 1) {
  const base = netBase(u, v), moved = netPoint(u, v, round, time, sag);
  // A local pocket pulls back as well as down. The ball uses this exact surface.
  const depth = NET_DEPTH - Math.max(0, moved.y - base.y) / 222 * .3;
  return projectPitch((moved.x - 345) / 590, depth, (395 - moved.y) / 222);
}
const phase = (t, a, b) => clamp((t - a) / (b - a));
const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
function projectedBall(u, d, h, r) { return { ...projectPitch(u, d, h), r, ground: projectPitch(u, d), height: h }; }
export function tvBallAt(round, time, sag = 1) {
  if (!round || time <= TIMING.kick) return { ...TV_BALL_START, ground: projectPitch(.5, 1), height: .042 };
  const shot = targetFor(round.shotZone), miss = round.outcome === 'miss';
  const target = miss ? { x: shot.x < 640 ? 259 : shot.x > 640 ? 1022 : 640, y: shot.x === 640 ? 122 : shot.y - 12 } : shot;
  const u = (target.x - FIELD.left) / (FIELD.right - FIELD.left), h = (FIELD.bottom - target.y) / (FIELD.bottom - FIELD.top);
  if (time <= TIMING.contact) {
    const flight = 1 - (1 - phase(time, TIMING.kick, TIMING.contact)) ** 1.22;
    return projectedBall(lerp(.5, u, flight), 1 - flight, lerp(.042, h, flight) + Math.sin(flight * Math.PI) * .116, lerp(7.4, 6.8, flight));
  }
  if (round.outcome === 'save') {
    const pose = tvKeeperPose(round, time);
    return { ...mix(pose.wl, pose.wr, .5), r: 6.8 };
  }
  if (round.outcome === 'parry') {
    const flight = phase(time, TIMING.contact, 2.65), side = shot.x < 640 ? -1 : 1;
    return projectedBall(u + side * .32 * flight, .48 * flight, lerp(h, .042, flight) + .43 * Math.sin(flight * Math.PI), lerp(6.8, 7.3, flight));
  }
  if (miss) {
    const flight = phase(time, TIMING.contact, 2.55);
    return projectedBall(u + (u - .5) * .2 * flight, -.58 * flight, lerp(h, .042, flight) + .22 * Math.sin(flight * Math.PI), lerp(6.8, 5.8, flight));
  }
  if (time < TIMING.net) return { ...mix(projectGoalPoint(shot), tvNetPoint(shot.u, shot.v, round, TIMING.net, sag), phase(time, TIMING.contact, TIMING.net)), r: 6.7 };
  const age = time - TIMING.net, slip = smooth(phase(age, .18, 1.28));
  return { ...tvNetPoint(shot.u, lerp(shot.v, .965, slip), round, time, sag), r: 6.6, squash: Math.sin(Math.PI * clamp(age / .18)) * .2 };
}

export function tvStrikerPose(time, isPlaying) {
  const run = isPlaying ? clamp(time / TIMING.kick) : 0;
  const after = isPlaying ? clamp((time - TIMING.kick) / .38) : 0;
  const step = Math.sin(run * Math.PI * 4) * Math.sin(run * Math.PI);
  const root = { x: lerp(1137, TV_BALL_START.x + 38, smooth(run)), y: lerp(575, TV_BALL_START.y + 8, smooth(run)) };
  const lean = after * 8, bounce = Math.abs(step) * 4;
  const kick = { x: -12 - step * 27, y: -Math.max(0, step) * 24 };
  if (run > .76) { const swing = smooth((run - .76) / .24); kick.x = lerp(29, -38, swing); kick.y = lerp(-33, -8, swing); }
  if (after > 0) { kick.x = lerp(-38, -61, after); kick.y = -8 - Math.sin(after * Math.PI / 2) * 42; }
  if (isPlaying && time > 1.3) { const settle = smooth((time - 1.3) / .62); kick.x = lerp(-61, -25, settle); kick.y = lerp(-50, 0, settle); }
  return { root, run, after, step, lean, bounce, kick,
    boot: { x: root.x + kick.x, y: root.y + kick.y } };
}
