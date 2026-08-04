import { getZone } from "./shootout-core.mjs";
import {
  BALL_RADIUS,
  GOAL,
  SCENE_LAYOUT,
  goalPocketWorld,
  goalTargetWorld,
  lerpVec
} from "./shootout-net.mjs";

// 0.9H5 broadcast finalization timing. The camera remains fixed while the
// taker plants, the keeper commits, and the physical outcome becomes readable
// before any result badge or crowd sting is allowed to appear.
export const REPLAY_TIMELINE = Object.freeze({
  readyCue: 0.025,
  anticipationStart: 0.075,
  plantStart: 0.185,
  strike: 0.255,
  keeperTakeoff: 0.270,
  keeperContact: 0.575,
  goalPlane: 0.595,
  resultReveal: 0.705,
  celebrationStart: 0.745,
  settleStart: 0.845
});

export function deterministicReplaySeed(replay = {}) {
  const text = [
    replay.kickIndex ?? 0,
    replay.shotZone ?? "bottom-centre",
    replay.keeperZone ?? "bottom-centre",
    replay.outcome ?? "miss",
    replay.reason ?? ""
  ].join("|");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function missTargetWorld(zone, replay = {}, goal = GOAL) {
  const contact = goalTargetWorld(zone, goal);
  const seed = deterministicReplaySeed(replay);
  const isTop = zone.v < 0.35;
  const isCentre = zone.u > 0.3 && zone.u < 0.7;
  const visualLeft = zone.u < 0.5;

  if (isTop || (isCentre && seed > 0.46)) {
    return {
      x: contact.x + (seed - 0.5) * 0.58,
      y: goal.height + 0.54 + seed * 0.48,
      z: 0
    };
  }

  return {
    x: visualLeft ? goal.width / 2 + 0.72 + seed * 0.52 : -goal.width / 2 - 0.72 - seed * 0.52,
    y: Math.max(BALL_RADIUS * 1.15, contact.y * (0.76 + seed * 0.12)),
    z: 0
  };
}

export function shotContactWorld(replay, goal = GOAL) {
  const zone = getZone(replay.shotZone);
  return replay.outcome === "miss"
    ? missTargetWorld(zone, replay, goal)
    : goalTargetWorld(zone, goal);
}

export function sampleBallWorld(replay, progress, goal = GOAL) {
  const p = clamp(progress, 0, 1);
  const zone = getZone(replay.shotZone);
  const start = SCENE_LAYOUT.ballStart;
  const contact = shotContactWorld(replay, goal);
  const seed = deterministicReplaySeed(replay);
  const strike = REPLAY_TIMELINE.strike;
  const plane = replay.outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const flight = clamp((p - strike) / (plane - strike), 0, 1);
  const physicalT = flightTimeMap(flight, replay.shotActive !== false);
  const curve = shotCurveWorld(start, contact, zone, physicalT, seed, replay.shotActive !== false);
  let position = curve;
  let phase = p < strike ? "set" : p < plane ? "flight" : replay.outcome;
  let visible = p > 0.035;
  let spin = physicalT * (Math.PI * (9.5 + seed * 4.5));
  let speed = flightSpeedEstimate(start, contact, zone, physicalT, seed, replay.shotActive !== false);

  if (p < strike) {
    position = { ...start };
    spin = 0;
    speed = 0;
  } else if (replay.outcome === "goal" && p >= plane) {
    const netT = clamp((p - plane) / (1 - plane), 0, 1);
    const pocket = goalPocketWorld(zone, goal);
    position = sampleGoalPocket(contact, pocket, zone, netT, seed);
    spin += netT * Math.PI * 2.2;
    speed = Math.max(0.08, speed * Math.exp(-4.7 * netT));
    phase = netT < 0.52 ? "net-impact" : "net-settle";
  } else if (replay.outcome === "save" && p >= plane) {
    const deflectT = clamp((p - plane) / (1 - plane), 0, 1);
    position = sampleSaveDeflection(contact, zone, deflectT, seed);
    spin += deflectT * Math.PI * 7.5;
    speed = Math.max(0.18, speed * (1 - deflectT * 0.72));
    phase = deflectT < 0.24 ? "glove-contact" : "deflection";
  } else if (replay.outcome === "miss" && p >= plane) {
    const missT = clamp((p - plane) / (1 - plane), 0, 1);
    position = sampleMissContinuation(contact, zone, missT, seed);
    spin += missT * Math.PI * 8;
    speed = Math.max(0.22, speed * (1 - missT * 0.44));
    phase = "miss-flight";
    if (missT > 0.93 && Math.abs(position.x) > goal.width) visible = false;
  }

  return {
    position,
    phase,
    visible,
    spin,
    speed,
    flight,
    contact,
    seed
  };
}

export function sampleBallTrail(replay, progress, samples = 5) {
  const points = [];
  const spacing = replay.outcome === "goal" ? 0.012 : 0.014;
  for (let index = samples; index >= 1; index -= 1) {
    const p = Math.max(0, progress - index * spacing);
    const sample = sampleBallWorld(replay, p);
    if (sample.visible && sample.phase !== "set") points.push(sample);
  }
  return points;
}

export function sampleKeeperMotion(replay, progress, camera) {
  const p = clamp(progress, 0, 1);
  const keeperZone = getZone(replay.keeperZone);
  const shotZone = getZone(replay.shotZone);
  const active = replay.keeperActive !== false;
  const ground = camera.project(SCENE_LAYOUT.keeperBase);
  const base = {
    x: ground.x,
    y: ground.y - SCENE_LAYOUT.keeperFootOffset * SCENE_LAYOUT.keeperScale
  };
  const targetWorld = goalTargetWorld(keeperZone);
  const target = camera.project({ ...targetWorld, z: 0.08 });
  const landingGround = camera.project({
    x: targetWorld.x,
    y: 0,
    z: SCENE_LAYOUT.keeperBase.z
  });
  const direction = Math.sign(target.x - base.x) || 1;
  const takeoff = REPLAY_TIMELINE.keeperTakeoff;
  const contactTime = REPLAY_TIMELINE.keeperContact;
  const diveT = clamp((p - takeoff) / (contactTime - takeoff), 0, 1);
  const activeScale = active ? 1 : 0.43;
  const eased = smoothstep(diveT) * activeScale;
  const verticalArc = Math.sin(Math.PI * diveT) * (active ? 34 : 14);
  let x = lerp(base.x, target.x - direction * 24, eased);
  let y = lerp(base.y, target.y + 32, eased) - verticalArc * activeScale;
  let stretch = easeOutCubic(diveT) * activeScale;
  let landing = 0;

  if (p > contactTime) {
    const after = clamp((p - contactTime) / (1 - contactTime), 0, 1);
    const successfulContact = replay.outcome === "save" && active && replay.shotZone === replay.keeperZone;
    const carry = successfulContact ? 52 : 82;
    x += direction * carry * easeOutCubic(after) * activeScale;
    y += (after * after * 112 - Math.sin(after * Math.PI) * 22) * activeScale;
    stretch *= 1 - 0.22 * after;
    landing = smoothstep(clamp((after - 0.40) / 0.50, 0, 1));
  }

  const shotTarget = camera.project(goalTargetWorld(shotZone));
  const meetsBall = replay.outcome === "save" && active && replay.shotZone === replay.keeperZone;
  if (meetsBall) {
    const contactBlend = Math.exp(-Math.pow((p - contactTime) / 0.055, 2));
    x = lerp(x, shotTarget.x - direction * 93 * SCENE_LAYOUT.keeperScale, contactBlend * 0.58);
    y = lerp(y, shotTarget.y + 44, contactBlend * 0.72);
  }

  const settle = smoothstep(landing);
  stretch = lerp(stretch, active ? 0.62 : 0.28, settle);
  const lean = lerp(
    direction * lerp(0, 1.13, stretch),
    direction * (active ? 1.28 : 0.72),
    settle
  );
  const scale = lerp(SCENE_LAYOUT.keeperScale, 0.86, Math.min(1, stretch));
  const squash = Math.sin(landing * Math.PI) * 0.08 + landing * 0.035;

  // During the dive, the keeper is intentionally separated from the pitch.
  // Once the landing phase begins, solve the final body anchor from the
  // lowest transformed limb point so the character cannot finish hovering.
  if (landing > 0) {
    const groundOffset = keeperGroundContactOffset({ lean, stretch, scale, squash });
    const groundedY = landingGround.y - groundOffset - 3;
    y = lerp(y, groundedY, settle);
  }

  const shadowTravel = smoothstep(clamp((p - takeoff) / (1 - takeoff), 0, 1));

  return {
    x,
    y,
    lean,
    stretch,
    scale,
    squash,
    airborne: diveT > 0 && landing < 0.72,
    direction,
    shadowX: lerp(ground.x, landingGround.x, shadowTravel),
    shadowY: lerp(ground.y, landingGround.y, shadowTravel),
    landing
  };
}

export function keeperGroundContactOffset({ lean, stretch, scale, squash = 0 }) {
  const verticalScale = scale * (1 - squash);
  const points = [
    [-34 - stretch * 23, 140],
    [34 + stretch * 23, 140],
    [-72 - stretch * 62, -31 - stretch * 29],
    [72 + stretch * 62, -31 - stretch * 29],
    [-36, 76],
    [36, 76],
    [0, -9]
  ];

  return Math.max(...points.map(([pointX, pointY]) => (
    verticalScale * (Math.sin(lean) * pointX + Math.cos(lean) * pointY)
  )));
}

export function ballRenderScale(camera, position) {
  const startScale = camera.project(SCENE_LAYOUT.ballStart).scale;
  const currentScale = camera.project(position).scale;
  return clamp(currentScale / startScale, 0.50, 1.14);
}

function shotCurveWorld(start, end, zone, t, seed, active) {
  const high = zone.v < 0.35;
  const centre = zone.u > 0.3 && zone.u < 0.7;
  const line = lerpVec(start, end, t);
  const arcHeight = active
    ? high ? 0.83 + seed * 0.18 : 0.24 + seed * 0.12
    : high ? 0.46 : 0.15;
  const curveDirection = zone.u < 0.5 ? -1 : zone.u > 0.5 ? 1 : seed > 0.5 ? 1 : -1;
  const curveAmount = (centre ? 0.08 : 0.15) * (0.72 + seed * 0.56) * (active ? 1 : 1.35);
  const curveEnvelope = Math.pow(Math.sin(Math.PI * t), 1.35);
  const lateDip = (high ? 0.16 : 0.06) * Math.pow(t, 2.2) * (1 - t) * 4;
  return {
    x: line.x + curveDirection * curveAmount * curveEnvelope,
    y: line.y + arcHeight * 4 * t * (1 - t) - lateDip,
    z: line.z
  };
}

function sampleGoalPocket(contact, pocket, zone, t, seed) {
  const spring = dampedSpring01(t, 5.6, 9.2 + seed * 1.8);
  let point = lerpVec(contact, pocket, clamp(spring, 0, 1.09));
  const high = zone.v < 0.35;
  const settle = smoothstep(clamp((t - 0.46) / 0.54, 0, 1));
  const floorY = BALL_RADIUS * 1.08;
  point = {
    x: point.x + Math.sin(t * Math.PI * 5 + seed * Math.PI) * 0.035 * t * (1 - t),
    y: lerp(point.y, floorY, settle * (high ? 0.93 : 0.58)),
    z: point.z - Math.sin(t * Math.PI * 3.4) * 0.09 * Math.exp(-3.2 * t)
  };
  return point;
}

function sampleSaveDeflection(contact, zone, t, seed) {
  const side = zone.u < 0.5 ? 1 : zone.u > 0.5 ? -1 : seed > 0.5 ? 1 : -1;
  const seconds = t * 0.88;
  const vx = side * (2.2 + seed * 0.72);
  const vy = zone.v < 0.35 ? 1.55 + seed * 0.45 : 1.05 + seed * 0.30;
  const vz = -3.15 - seed * 0.85;
  let x = contact.x + vx * seconds;
  let y = contact.y + vy * seconds - 4.65 * seconds * seconds;
  let z = contact.z + vz * seconds;

  if (y < BALL_RADIUS) {
    const penetration = BALL_RADIUS - y;
    y = BALL_RADIUS + Math.abs(Math.sin((t + seed * 0.15) * Math.PI * 2.4)) * penetration * 0.42;
    x += side * t * 0.18;
  }

  return { x, y, z };
}

function sampleMissContinuation(contact, zone, t, seed) {
  const isOver = contact.y > GOAL.height;
  const side = contact.x >= 0 ? 1 : -1;
  const seconds = t * 0.82;
  const vx = isOver ? (seed - 0.5) * 0.55 : side * (1.35 + seed * 0.45);
  const vy = isOver ? 0.42 : 0.34 + seed * 0.24;
  const vz = 3.7 + seed * 0.85;
  let y = contact.y + vy * seconds - 2.8 * seconds * seconds;
  if (y < BALL_RADIUS) y = BALL_RADIUS + Math.abs(Math.sin(t * Math.PI * 2)) * 0.16 * (1 - t);
  return {
    x: contact.x + vx * seconds,
    y,
    z: contact.z + vz * seconds
  };
}

function flightSpeedEstimate(start, end, zone, t, seed, active) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
  const base = distance * (active ? 3.05 : 2.05);
  const highBoost = zone.v < 0.35 ? 1.08 : 1;
  const airLoss = 1 - t * (0.08 + seed * 0.03);
  return base * highBoost * airLoss;
}

function flightTimeMap(t, active) {
  if (!active) return clamp(t + Math.sin(Math.PI * t) * 0.018, 0, 1);
  return clamp(t + Math.sin(Math.PI * t) * 0.052, 0, 1);
}

function dampedSpring01(t, damping, frequency) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-damping * t) * Math.cos(frequency * t);
}

function smoothstep(t) { return t * t * (3 - 2 * t); }
function easeOutCubic(t) { return 1 - (1 - t) ** 3; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
