import { REPLAY_TIMELINE } from "./shootout-physics-0.9h5a2.mjs";
import { netSagEnvelope, netSagProfile } from "./shootout-net.mjs?v=0.9.30";
import { keeperCameraFrame } from "./shootout-cinematics.mjs";
import {
  PENALTY_VIEWERS,
  canonicalPenaltyZone,
  normalizePenaltyViewer,
  perspectiveLabel,
  zoneForCamera,
  zoneForViewer
} from "./penalty-perspective.mjs";

export const PENALTY_BALL_RENDER_OWNER = "dedicated-ball-layer";

export const PENALTY_VISUAL_ASSETS = Object.freeze({
  environment: {
    crowd: "./assets/penalty-0.9f/stadium-crowd.jpg",
    pitch: "./assets/penalty-0.9f/pitch-texture.jpg"
  },
  establishing: "./assets/penalty-0.9f/establishing.jpg",
  striker: Object.freeze([
    "./assets/penalty-0.9f/striker-1.jpg",
    "./assets/penalty-0.9f/striker-2.jpg",
    "./assets/penalty-0.9f/striker-3.jpg",
    "./assets/penalty-0.9f/striker-4.jpg",
    "./assets/penalty-0.9f/striker-5.jpg"
  ]),
  keeper: Object.freeze([
    "./assets/penalty-0.9f/keeper-1.jpg",
    "./assets/penalty-0.9f/keeper-2.jpg",
    "./assets/penalty-0.9f/keeper-3.jpg",
    "./assets/penalty-0.9f/keeper-4.jpg",
    "./assets/penalty-0.9f/keeper-5.jpg"
  ]),
  outcome: Object.freeze({
    goal: "./assets/penalty-0.9h1/outcome-goal-clean.jpg",
    save: "./assets/penalty-0.9f/outcome-save.jpg",
    miss: "./assets/penalty-0.9f/outcome-miss.jpg"
  }),
  singleAngle: Object.freeze({
    selectionBackground: "./assets/penalty-single-angle/broadcast-selection-0.9h4d.png",
    background: "./assets/penalty-single-angle/broadcast-action-0.9h4d.png",
    strikerContact: "./assets/penalty-single-angle/striker-contact-0.9h5a2.png",
    ball: "./assets/penalty-single-angle/realistic-ball-0.9h4d.png",
    strikerFollow: "./assets/penalty-single-angle/striker-follow-0.9h5a2.png",
    keeperReady: "./assets/penalty-single-angle/keeper-ready-0.9h5a2.png",
    keeperHighLeft: "./assets/penalty-single-angle/keeper-dive-right-0.9h5a2.png",
    keeperHighRight: "./assets/penalty-single-angle/keeper-dive-left-0.9h5a2.png",
    keeperLowLeft: "./assets/penalty-single-angle/keeper-dive-right-0.9h5a2.png",
    keeperLowRight: "./assets/penalty-single-angle/keeper-dive-left-0.9h5a2.png"
  })
});

// 0.9G uses the photographed penalty setup as the coordinate system for both
// interaction and replay. These points are calibrated to striker-1.jpg.
export const REALISTIC_SELECTION_POINTS = Object.freeze({
  ball: Object.freeze({ x: 794, y: 625 }),
  keeper: Object.freeze({ x: 665, y: 354 }),
  zones: Object.freeze({
    "top-left": Object.freeze({ x: 264, y: 172 }),
    "top-centre": Object.freeze({ x: 640, y: 164 }),
    "top-right": Object.freeze({ x: 1016, y: 172 }),
    "bottom-left": Object.freeze({ x: 252, y: 348 }),
    "bottom-centre": Object.freeze({ x: 640, y: 344 }),
    "bottom-right": Object.freeze({ x: 1028, y: 348 })
  })
});


// 0.9H4D uses the exact six user-marked X coordinates in the uploaded broadcast frame.
// All six choices sit inside the visible goal around the goalkeeper.
export const BROADCAST_SELECTION_POINTS = Object.freeze({
  // Exact black-X calibration from the user's annotated 1585×857 screenshot.
  // Screen centres: TL 237.22/406.11, TC 378.90/370.10, TR 524.67/341.34,
  // BL 243.48/579.05, BC 401.56/543.96, BR 529.62/499.57.
  ball: Object.freeze({ x: 939, y: 530 }),
  keeper: Object.freeze({ x: 305, y: 392 }),
  zones: Object.freeze({
    "top-left": Object.freeze({ x: 184, y: 341 }),
    "top-centre": Object.freeze({ x: 300, y: 311 }),
    "top-right": Object.freeze({ x: 419, y: 287 }),
    "bottom-left": Object.freeze({ x: 189, y: 487 }),
    "bottom-centre": Object.freeze({ x: 318, y: 457 }),
    "bottom-right": Object.freeze({ x: 423, y: 420 })
  })
});

// 0.9G2 action-camera coordinates, calibrated to establishing.jpg.
export const PENALTY_ACTION_POINTS = Object.freeze({
  ball: Object.freeze({ x: 640, y: 626 }),
  zones: Object.freeze({
    "top-left": Object.freeze({ x: 356, y: 326 }),
    "top-centre": Object.freeze({ x: 640, y: 318 }),
    "top-right": Object.freeze({ x: 924, y: 326 }),
    "bottom-left": Object.freeze({ x: 348, y: 468 }),
    "bottom-centre": Object.freeze({ x: 640, y: 466 }),
    "bottom-right": Object.freeze({ x: 932, y: 468 })
  })
});

// 0.9H2 keeper-view coordinates with canonical camera projection. Canonical match zones are mirrored only at
// presentation time so the stored result never changes with the camera.
export const KEEPER_POV_POINTS = Object.freeze({
  ball: Object.freeze({ x: 640, y: 402 }),
  striker: Object.freeze({ x: 640, y: 348 }),
  zones: Object.freeze({
    "top-left": Object.freeze({ x: 214, y: 196 }),
    "top-centre": Object.freeze({ x: 640, y: 174 }),
    "top-right": Object.freeze({ x: 1066, y: 196 }),
    "bottom-left": Object.freeze({ x: 196, y: 500 }),
    "bottom-centre": Object.freeze({ x: 640, y: 516 }),
    "bottom-right": Object.freeze({ x: 1084, y: 500 })
  })
});


// 0.9H2C uses one photographic action camera for the keeper's replay.
// The ball and the keeper share this coordinate system, so no detached
// mini-goal or explanatory impact panel is required.
export const KEEPER_ACTION_POINTS = Object.freeze({
  ball: Object.freeze({ x: 640, y: 626 }),
  zones: Object.freeze({
    "top-left": Object.freeze({ x: 188, y: 246 }),
    "top-centre": Object.freeze({ x: 640, y: 232 }),
    "top-right": Object.freeze({ x: 1092, y: 246 }),
    "bottom-left": Object.freeze({ x: 214, y: 468 }),
    "bottom-centre": Object.freeze({ x: 640, y: 486 }),
    "bottom-right": Object.freeze({ x: 1066, y: 468 })
  })
});

// 0.9H3 motion timing keeps the ball decisive while letting the keeper visibly
// anticipate, take off, extend and land. These values affect presentation only.
export const PENALTY_MOTION_TIMING = Object.freeze({
  anticipationStart: REPLAY_TIMELINE.strike - 0.075,
  keeperLaunch: REPLAY_TIMELINE.strike + 0.018,
  keeperFullExtension: REPLAY_TIMELINE.keeperContact,
  landingStart: REPLAY_TIMELINE.resultReveal + 0.035,
  frameTransitionWidth: 0.22
});

export function naturalBallFlightEasing(rawT = 0) {
  const t = clamp(rawT, 0, 1);
  // A penalty leaves the boot sharply, then loses only a little apparent speed
  // as perspective makes the ball smaller near the goal.
  return clamp(1 - Math.pow(1 - t, 1.82), 0, 1);
}

export function naturalFrameSequence(rawT = 0, frameCount = 5, transitionWidth = PENALTY_MOTION_TIMING.frameTransitionWidth) {
  const count = Math.max(1, Math.floor(frameCount));
  const t = clamp(rawT, 0, 1);
  const position = t * Math.max(0, count - 1);
  const index = Math.min(count - 1, Math.floor(position));
  const nextIndex = Math.min(count - 1, index + 1);
  const local = position - index;
  const width = clamp(transitionWidth, 0.05, 0.9);
  const transitionStart = 1 - width;
  const mix = index === nextIndex ? 0 : smoothstep(clamp((local - transitionStart) / width, 0, 1));
  return { index, nextIndex, mix, position, local, t };
}

export function keeperDiveMotionState(replay = {}, progress = 0) {
  const p = clamp(progress, 0, 1);
  const outcome = replay.outcome || "miss";
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const anticipation = smoothstep(clamp(
    (p - PENALTY_MOTION_TIMING.anticipationStart) /
    Math.max(0.001, PENALTY_MOTION_TIMING.keeperLaunch - PENALTY_MOTION_TIMING.anticipationStart),
    0,
    1
  ));
  const launch = clamp(
    (p - PENALTY_MOTION_TIMING.keeperLaunch) /
    Math.max(0.001, contact - PENALTY_MOTION_TIMING.keeperLaunch),
    0,
    1
  );
  const extension = 1 - Math.pow(1 - launch, 2.15);
  const landing = smoothstep(clamp(
    (p - PENALTY_MOTION_TIMING.landingStart) /
    Math.max(0.001, 1 - PENALTY_MOTION_TIMING.landingStart),
    0,
    1
  ));
  const keeperZone = canonicalPenaltyZone(replay, "keeperZone");
  const effect = penaltyZoneEffect(keeperZone);
  return {
    anticipation,
    launch,
    extension,
    landing,
    direction: effect.side,
    level: effect.level,
    keeperZone,
    contact
  };
}



// 0.9G1 gives every goal coordinate its own trajectory, keeper response and
// impact language. These values are expressed in the same 1280×720 calibrated
// photograph used by the selection screen.
export const PENALTY_ZONE_EFFECTS = Object.freeze({
  "top-left": Object.freeze({ arc: 214, bend: -72, side: -1, level: "high", goal: "upper-side-net", miss: "bar-left" }),
  "top-centre": Object.freeze({ arc: 238, bend: 0, side: 0, level: "high", goal: "roof-net", miss: "over-centre" }),
  "top-right": Object.freeze({ arc: 214, bend: 72, side: 1, level: "high", goal: "upper-side-net", miss: "bar-right" }),
  "bottom-left": Object.freeze({ arc: 102, bend: -48, side: -1, level: "low", goal: "lower-side-net", miss: "wide-left" }),
  "bottom-centre": Object.freeze({ arc: 76, bend: 0, side: 0, level: "low", goal: "low-centre-net", miss: "scuffed-wide" }),
  "bottom-right": Object.freeze({ arc: 102, bend: 48, side: 1, level: "low", goal: "lower-side-net", miss: "wide-right" })
});

export function penaltyZoneEffect(zoneId = "bottom-centre") {
  return PENALTY_ZONE_EFFECTS[zoneId] || PENALTY_ZONE_EFFECTS["bottom-centre"];
}

export function penaltyMissPoint(zoneId = "bottom-centre", replay = {}) {
  const effect = penaltyZoneEffect(zoneId);
  const parity = Number(replay.kickIndex || 0) % 2 === 0 ? -1 : 1;
  switch (effect.miss) {
    case "bar-left": return { x: 182, y: 108, label: "CLIPS THE BAR" };
    case "bar-right": return { x: 1098, y: 108, label: "CLIPS THE BAR" };
    case "over-centre": return { x: 640, y: 70, label: "OVER THE BAR" };
    case "wide-left": return { x: 146, y: 372, label: "DRAGS IT WIDE" };
    case "wide-right": return { x: 1134, y: 372, label: "PUSHES IT WIDE" };
    case "scuffed-wide": return { x: parity < 0 ? 164 : 1116, y: 422, label: "SCUFFED WIDE" };
    default: return { x: 640, y: 70, label: "OFF TARGET" };
  }
}

export function penaltyImpactPoint(replay = {}) {
  const zoneId = canonicalPenaltyZone(replay, "shotZone");
  if (replay.outcome === "miss") return penaltyMissPoint(zoneId, replay);
  const targets = REALISTIC_SELECTION_POINTS.zones;
  // Historical 0.9G contract: targets[replay.shotZone] now reads through the canonical guard.
  const target = targets[canonicalPenaltyZone(replay, "shotZone")] || targets["bottom-centre"];
  return { ...target, label: zoneLabel(zoneId) };
}

export function penaltyFlightPoint(replay = {}, rawT = 0) {
  const t = smoothstep(clamp(rawT, 0, 1));
  const start = BROADCAST_SELECTION_POINTS.ball;
  const target = penaltyImpactPoint(replay);
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const control = {
    x: start.x + (target.x - start.x) * 0.47 + effect.bend,
    y: Math.min(start.y, target.y) - effect.arc
  };
  const oneMinus = 1 - t;
  return {
    x: oneMinus * oneMinus * start.x + 2 * oneMinus * t * control.x + t * t * target.x,
    y: oneMinus * oneMinus * start.y + 2 * oneMinus * t * control.y + t * t * target.y,
    target,
    control,
    t
  };
}

export function penaltyActionImpactPoint(replay = {}) {
  const zoneId = canonicalPenaltyZone(replay, "shotZone");
  const effect = penaltyZoneEffect(zoneId);
  if (replay.outcome !== "miss") return { ...PENALTY_ACTION_POINTS.zones[zoneId], label: zoneLabel(zoneId) };
  const parity = Number(replay.kickIndex || 0) % 2 === 0 ? -1 : 1;
  switch (effect.miss) {
    case "bar-left": return { x: 284, y: 286, label: "CLIPS THE BAR" };
    case "bar-right": return { x: 996, y: 286, label: "CLIPS THE BAR" };
    case "over-centre": return { x: 640, y: 238, label: "OVER THE BAR" };
    case "wide-left": return { x: 164, y: 474, label: "DRAGS IT WIDE" };
    case "wide-right": return { x: 1116, y: 474, label: "PUSHES IT WIDE" };
    case "scuffed-wide": return { x: parity < 0 ? 148 : 1132, y: 548, label: "SCUFFED WIDE" };
    default: return { x: 640, y: 238, label: "OFF TARGET" };
  }
}

export function penaltyActionFlightPoint(replay = {}, rawT = 0) {
  const t = smoothstep(clamp(rawT, 0, 1));
  const start = PENALTY_ACTION_POINTS.ball;
  const target = penaltyActionImpactPoint(replay);
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const control = {
    x: start.x + (target.x - start.x) * 0.48 + effect.bend * 0.52,
    y: Math.min(start.y, target.y) - effect.arc * (effect.level === "high" ? 0.78 : 0.66)
  };
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * target.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * target.y,
    target, control, t
  };
}


export function penaltyActionImpactPointForViewer(replay = {}, viewerRole = PENALTY_VIEWERS.STRIKER) {
  const role = normalizePenaltyViewer(viewerRole);
  if (role !== PENALTY_VIEWERS.KEEPER) return penaltyActionImpactPoint(replay);
  const viewedZone = zoneForViewer(canonicalPenaltyZone(replay, "shotZone"), role);
  if (replay.outcome !== "miss") {
    return { ...KEEPER_POV_POINTS.zones[viewedZone], label: zoneLabel(viewedZone) };
  }
  const parity = Number(replay.kickIndex || 0) % 2 === 0 ? -1 : 1;
  switch (viewedZone) {
    case "top-left": return { x: 174, y: 154, label: "CLIPS THE BAR" };
    case "top-right": return { x: 1106, y: 154, label: "CLIPS THE BAR" };
    case "top-centre": return { x: 640, y: 86, label: "OVER THE BAR" };
    case "bottom-left": return { x: 54, y: 526, label: "PUSHES IT WIDE" };
    case "bottom-right": return { x: 1226, y: 526, label: "DRAGS IT WIDE" };
    case "bottom-centre": return { x: parity < 0 ? 1168 : 112, y: 570, label: "SCUFFED WIDE" };
    default: return { x: 640, y: 86, label: "OFF TARGET" };
  }
}

export function keeperPerspectiveBallState(replay = {}, rawT = 0) {
  const t = smoothstep(clamp(rawT, 0, 1));
  const start = KEEPER_POV_POINTS.ball;
  const target = penaltyActionImpactPointForViewer(replay, PENALTY_VIEWERS.KEEPER);
  const viewedZone = zoneForViewer(canonicalPenaltyZone(replay, "shotZone"), PENALTY_VIEWERS.KEEPER);
  const effect = penaltyZoneEffect(viewedZone);
  const control = {
    x: start.x + (target.x - start.x) * 0.48 + effect.bend * 0.24,
    y: Math.min(start.y, target.y) - (effect.level === "high" ? 92 : 28)
  };
  const u = 1 - t;
  const x = u * u * start.x + 2 * u * t * control.x + t * t * target.x;
  const y = u * u * start.y + 2 * u * t * control.y + t * t * target.y;
  const direction = effect.side || 1;
  return {
    x,
    y,
    target,
    control,
    t,
    radius: lerp(6.5, 34, t),
    rotation: t * Math.PI * (15 + Math.abs(effect.bend) / 14) * direction,
    squashX: t > 0.92 ? 1.08 : 1,
    squashY: t > 0.92 ? 0.94 : 1,
    shadow: {
      x: lerp(start.x, target.x, t),
      y: lerp(431, effect.level === "high" ? 548 : 556, t),
      radiusX: lerp(7, 30, t),
      radiusY: lerp(2.5, 8, t),
      opacity: effect.level === "high" ? lerp(0.09, 0.05, t) : lerp(0.12, 0.20, t)
    }
  };
}

export function keeperPerspectiveDivePoint(zoneId = "bottom-centre", rawT = 0) {
  const viewedZone = zoneForViewer(zoneId, PENALTY_VIEWERS.KEEPER);
  const target = KEEPER_POV_POINTS.zones[viewedZone] || KEEPER_POV_POINTS.zones["bottom-centre"];
  const t = smoothstep(clamp(rawT, 0, 1));
  return {
    x: lerp(640, target.x, t),
    y: lerp(650, target.y + 18, t),
    t,
    viewedZone,
    target
  };
}


export function keeperActionImpactPoint(replay = {}) {
  const zoneId = canonicalPenaltyZone(replay, "shotZone");
  const effect = penaltyZoneEffect(zoneId);
  if (replay.outcome !== "miss") {
    return { ...KEEPER_ACTION_POINTS.zones[zoneId], label: zoneLabel(zoneId) };
  }
  const parity = Number(replay.kickIndex || 0) % 2 === 0 ? -1 : 1;
  switch (effect.miss) {
    case "bar-left": return { x: 188, y: 176, label: "CLIPS THE BAR" };
    case "bar-right": return { x: 1092, y: 176, label: "CLIPS THE BAR" };
    case "over-centre": return { x: 640, y: 122, label: "OVER THE BAR" };
    case "wide-left": return { x: 52, y: 468, label: "DRAGS IT WIDE" };
    case "wide-right": return { x: 1228, y: 468, label: "PUSHES IT WIDE" };
    case "scuffed-wide": return { x: parity < 0 ? 70 : 1210, y: 548, label: "SCUFFED WIDE" };
    default: return { x: 640, y: 122, label: "OFF TARGET" };
  }
}

export function keeperNaturalActionState(replay = {}, progress = 0) {
  const p = clamp(progress, 0, 1);
  const outcome = replay.outcome || "miss";
  const strike = REPLAY_TIMELINE.strike;
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const rawFlightT = clamp((p - strike) / Math.max(0.001, contact - strike), 0, 1);
  const flightT = naturalBallFlightEasing(rawFlightT);
  const motion = keeperDiveMotionState(replay, p);
  const diveT = motion.extension;
  const settleT = smoothstep(clamp((p - contact) / Math.max(0.001, 1 - contact), 0, 1));
  const start = KEEPER_ACTION_POINTS.ball;
  const target = keeperActionImpactPoint(replay);
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const control = {
    x: start.x + (target.x - start.x) * 0.47 + effect.bend * 0.24,
    y: Math.min(start.y, target.y) - (effect.level === "high" ? 104 : 42)
  };
  const u = 1 - flightT;
  let x = u*u*start.x + 2*u*flightT*control.x + flightT*flightT*target.x;
  let y = u*u*start.y + 2*u*flightT*control.y + flightT*flightT*target.y;
  let velocityX = 2 * u * (control.x - start.x) + 2 * flightT * (target.x - control.x);
  let velocityY = 2 * u * (control.y - start.y) + 2 * flightT * (target.y - control.y);
  let radius = lerp(23, 11.8, Math.pow(flightT, 0.82));
  let rotation = flightT * Math.PI * (15 + Math.abs(effect.bend) / 14) * (effect.side || 1);

  if (p >= contact) {
    if (outcome === "goal") {
      const settleDirection = effect.side || 1;
      x = target.x + settleDirection * Math.sin(settleT * Math.PI) * 6 * (1 - settleT);
      y = target.y - Math.sin(settleT * Math.PI) * 4 + settleT * (effect.level === "high" ? 25 : 12);
      velocityX = settleDirection * Math.cos(settleT * Math.PI) * 6 * (1 - settleT);
      velocityY = effect.level === "high" ? 25 : 12;
      radius = lerp(11.8, 11.2, settleT);
      rotation += settleT * Math.PI * 1.75 * settleDirection;
    } else if (outcome === "save") {
      const direction = effect.side || (Number(replay.kickIndex || 0) % 2 ? 1 : -1);
      const end = {
        x: clamp(target.x - direction * 310, 72, 1208),
        y: clamp(target.y + (effect.level === "high" ? 230 : 145), 130, 666)
      };
      const control2 = { x: target.x - direction * 126, y: target.y - 14 };
      const v = 1 - settleT;
      x = v*v*target.x + 2*v*settleT*control2.x + settleT*settleT*end.x;
      y = v*v*target.y + 2*v*settleT*control2.y + settleT*settleT*end.y;
      velocityX = 2 * v * (control2.x - target.x) + 2 * settleT * (end.x - control2.x);
      velocityY = 2 * v * (control2.y - target.y) + 2 * settleT * (end.y - control2.y);
      radius = lerp(11.8, 16, settleT);
      rotation += settleT * Math.PI * 7.2 * -direction;
    } else {
      const direction = effect.side || 1;
      const endX = clamp(target.x + direction * 190, 20, 1260);
      const endY = clamp(target.y + (effect.level === "high" ? -58 : 82), 24, 690);
      x = lerp(target.x, endX, settleT);
      y = lerp(target.y, endY, settleT);
      velocityX = endX - target.x;
      velocityY = endY - target.y;
      radius = lerp(11.8, 9.6, settleT);
      rotation += settleT * Math.PI * 6.5 * direction;
    }
  }

  const velocity = Math.hypot(velocityX, velocityY);
  const contactCompression = Math.exp(-Math.pow((p - contact) / 0.018, 2));
  return {
    progress: p,
    outcome,
    strike,
    contact,
    rawFlightT,
    flightT,
    diveT,
    settleT,
    anticipationT: motion.anticipation,
    launchT: motion.launch,
    landingT: motion.landing,
    start,
    target,
    control,
    x,
    y,
    radius,
    rotation,
    velocityX,
    velocityY,
    velocity,
    velocityAngle: Math.atan2(velocityY, velocityX),
    contactCompression,
    effect,
    visible: p >= strike - 0.004,
    keeperZone: motion.keeperZone
  };
}


// 0.9H adds presentation-state helpers around the deterministic 0.9G2 path.
// These helpers do not alter scoring or the stored shot coordinate.
export function penaltyBallPolishState(replay = {}, rawT = 0) {
  const point = penaltyActionFlightPoint(replay, rawT);
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const target = penaltyActionImpactPoint(replay);
  const direction = effect.side === 0 ? 1 : effect.side;
  const shadowEndY = effect.level === "high" ? 512 : 520;
  const shadow = {
    x: lerp(PENALTY_ACTION_POINTS.ball.x, target.x, point.t),
    y: lerp(654, shadowEndY, point.t),
    radiusX: lerp(28, 12, point.t),
    radiusY: lerp(8, 4, point.t)
  };
  const altitude = Math.max(0, shadow.y - point.y);
  shadow.opacity = clamp(0.31 - altitude / 760, 0.07, 0.27);
  return {
    ...point,
    radius: lerp(22.5, 11.5, point.t),
    rotation: point.t * Math.PI * (18 + Math.abs(effect.bend) / 8) * direction,
    shadow,
    speedLines: 2 + Math.round(point.t * 3),
    squashX: point.t < 0.075 ? 1 + Math.sin((point.t / 0.075) * Math.PI) * 0.18 : 1,
    squashY: point.t < 0.075 ? 1 - Math.sin((point.t / 0.075) * Math.PI) * 0.12 : 1
  };
}

export function keeperMotionPlan(zoneId = "bottom-centre", rawT = 0, outcome = "goal") {
  const effect = penaltyZoneEffect(zoneId);
  const t = clamp(rawT, 0, 1);
  const diveIndex = effect.side < 0 ? 3 : effect.side > 0 ? 2 : effect.level === "low" ? 4 : 1;

  if (t < 0.28) {
    const ready = naturalFrameSequence(t / 0.28, 2, 0.34);
    return {
      fromIndex: 0,
      toIndex: 1,
      mix: ready.mix,
      direction: effect.side,
      level: effect.level,
      phase: "set",
      extension: 0,
      landing: 0
    };
  }

  const diveT = clamp((t - 0.28) / 0.72, 0, 1);
  const extension = 1 - Math.pow(1 - diveT, 2.1);
  const mix = smoothstep(clamp((diveT - 0.08) / 0.36, 0, 1));
  const landing = smoothstep(clamp((diveT - 0.82) / 0.18, 0, 1));
  return {
    fromIndex: 1,
    toIndex: diveIndex,
    mix,
    direction: effect.side,
    level: effect.level,
    phase: outcome === "save" && diveT > 0.84 ? "contact" : landing > 0 ? "landing" : "dive",
    extension,
    landing
  };
}

export function penaltySaveDeflectionPoint(replay = {}, rawT = 0) {
  const t = smoothstep(clamp(rawT, 0, 1));
  const contact = penaltyActionImpactPoint({ ...replay, outcome: "save" });
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const direction = effect.side || (Number(replay.kickIndex || 0) % 2 ? 1 : -1);
  const end = {
    x: clamp(contact.x - direction * 260, 90, 1190),
    y: clamp(contact.y + (effect.level === "high" ? 190 : 112), 150, 650)
  };
  const control = { x: contact.x - direction * 120, y: contact.y - (effect.level === "high" ? 26 : 8) };
  const u = 1 - t;
  return {
    x: u*u*contact.x + 2*u*t*control.x + t*t*end.x,
    y: u*u*contact.y + 2*u*t*control.y + t*t*end.y,
    rotation: t * Math.PI * 8 * -direction,
    t
  };
}

export function penaltyMissReboundPoint(replay = {}, rawT = 0) {
  const t = smoothstep(clamp(rawT, 0, 1));
  const contact = penaltyActionImpactPoint({ ...replay, outcome: "miss" });
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  if (!effect.miss.startsWith("bar")) {
    return {
      x: lerp(contact.x, clamp(contact.x + (effect.side || 1) * 180, 40, 1240), t),
      y: lerp(contact.y, clamp(contact.y + (effect.level === "low" ? 74 : -55), 30, 680), t),
      rotation: t * Math.PI * 7 * (effect.side || 1),
      t
    };
  }
  const direction = effect.side || 1;
  const end = { x: clamp(contact.x - direction * 260, 90, 1190), y: contact.y + 174 };
  const control = { x: contact.x - direction * 85, y: contact.y - 72 };
  const u = 1 - t;
  return {
    x: u*u*contact.x + 2*u*t*control.x + t*t*end.x,
    y: u*u*contact.y + 2*u*t*control.y + t*t*end.y,
    rotation: t * Math.PI * 10 * -direction,
    t
  };
}

export function penaltyOutcomeCameraPlan(replay = {}) {
  const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
  const outcome = replay.outcome || "miss";
  if (outcome === "goal") return { asset: "goal", mirror: effect.side < 0, label: "NET CAM" };
  if (outcome === "save") return { asset: "save", mirror: effect.side < 0, label: "GLOVE CAM" };
  return { asset: "miss", mirror: effect.side < 0, label: "MISS CAM" };
}

export function keeperReactionPlan(zoneId = "bottom-centre") {
  const effect = penaltyZoneEffect(zoneId);
  if (effect.side < 0) return { imageIndex: 2, mirror: true, direction: "LEFT", level: effect.level };
  if (effect.side > 0) return { imageIndex: 2, mirror: false, direction: "RIGHT", level: effect.level };
  return { imageIndex: effect.level === "low" ? 4 : 1, mirror: false, direction: "CENTRE", level: effect.level };
}

export function penaltyVisualFramePlan(progress = 0, outcome = "goal", reducedMotion = false) {
  const p = clamp(progress, 0, 1);
  const strike = REPLAY_TIMELINE.strike;
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;

  if (reducedMotion) {
    return {
      phase: p < strike ? "establishing" : p < contact ? "physics" : "outcome",
      fullOpacity: p < 0.075 ? 0.78 : 0,
      fullFrame: p < 0.075 ? "establishing" : null,
      strikerIndex: 0,
      strikerNextIndex: 0,
      strikerMix: 0,
      keeperIndex: 0,
      keeperNextIndex: 0,
      keeperMix: 0,
      keeperInsetOpacity: 0,
      outcomeOpacity: p >= contact && p < contact + 0.055 ? 0.24 : 0,
      outcome
    };
  }

  if (p < 0.070) {
    return {
      phase: "establishing",
      fullFrame: "establishing",
      fullOpacity: fadeWindow(p, 0, 0.010, 0.052, 0.082),
      strikerIndex: 0,
      strikerNextIndex: 0,
      strikerMix: 0,
      keeperIndex: 0,
      keeperNextIndex: 0,
      keeperMix: 0,
      keeperInsetOpacity: 0,
      outcomeOpacity: 0,
      outcome
    };
  }

  const runupStart = 0.060;
  const runupEnd = strike + 0.050;
  const runupT = clamp((p - runupStart) / (runupEnd - runupStart), 0, 1);
  const strikerPosition = runupT * 4;
  const strikerIndex = Math.min(4, Math.floor(strikerPosition));
  const strikerNextIndex = Math.min(4, strikerIndex + 1);
  const strikerMix = smoothstep(strikerPosition - strikerIndex);
  const runupOpacity = fadeWindow(p, 0.055, 0.074, strike + 0.018, strike + 0.082);

  const keeperStart = 0.245;
  const keeperEnd = contact + 0.070;
  const keeperT = clamp((p - keeperStart) / (keeperEnd - keeperStart), 0, 1);
  const keeperPosition = keeperT * 4;
  const keeperIndex = Math.min(4, Math.floor(keeperPosition));
  const keeperNextIndex = Math.min(4, keeperIndex + 1);
  const keeperMix = smoothstep(keeperPosition - keeperIndex);
  const keeperInsetOpacity = fadeWindow(p, keeperStart, keeperStart + 0.035, contact + 0.015, contact + 0.11) * 0.82;

  const outcomeOpacity = fadeWindow(p, contact - 0.020, contact + 0.005, contact + 0.060, contact + 0.145) * 0.54;

  return {
    phase: p < runupEnd ? "run-up" : p < contact ? "ball-flight" : p < REPLAY_TIMELINE.resultReveal ? "impact" : "reaction",
    fullFrame: runupOpacity > 0.01 ? "striker" : null,
    fullOpacity: runupOpacity,
    strikerIndex,
    strikerNextIndex,
    strikerMix,
    keeperIndex,
    keeperNextIndex,
    keeperMix,
    keeperInsetOpacity,
    outcomeOpacity,
    outcome
  };
}



// 0.9H4 removes role-dependent cameras. Every participant watches one fixed
// broadcast-style angle, while the shot and dive still use independent stored
// coordinates. Each of the six zones has a dedicated taker follow-through and
// goalkeeper movement profile.
export const SINGLE_ANGLE_SHOT_MOVES = Object.freeze({
  "top-left": Object.freeze({ rotation: -0.034, translateX: -7, translateY: -5, arc: 205, bend: -62, followScaleX: 1.012, followScaleY: 0.992 }),
  "top-centre": Object.freeze({ rotation: -0.006, translateX: -1, translateY: -7, arc: 232, bend: 0, followScaleX: 1, followScaleY: 0.988 }),
  "top-right": Object.freeze({ rotation: 0.026, translateX: 7, translateY: -5, arc: 205, bend: 62, followScaleX: 1.012, followScaleY: 0.992 }),
  "bottom-left": Object.freeze({ rotation: -0.017, translateX: -5, translateY: 4, arc: 94, bend: -42, followScaleX: 1.006, followScaleY: 1.004 }),
  "bottom-centre": Object.freeze({ rotation: 0, translateX: 0, translateY: 7, arc: 72, bend: 0, followScaleX: 1, followScaleY: 1.008 }),
  "bottom-right": Object.freeze({ rotation: 0.017, translateX: 5, translateY: 4, arc: 94, bend: 42, followScaleX: 1.006, followScaleY: 1.004 })
});

export const BROADCAST_PLAYER_SCALE_LIMITS = Object.freeze({
  striker: Object.freeze({ maxWidth: 58, maxHeight: 124 }),
  keeperReady: Object.freeze({ maxWidth: 42, maxHeight: 108 }),
  keeperDive: Object.freeze({ maxWidth: 112, maxHeight: 58 })
});

export const SINGLE_ANGLE_KEEPER_MOVES = Object.freeze({
  // 0.9H5A1 uses ball-free transparent dive cutouts. Low reactions reuse the
  // same ball-free extension poses at a lower y-position; the dedicated ball
  // layer remains the only place a football can appear.
  "top-left": Object.freeze({ asset: "keeperHighLeft", x: 118, y: 322, width: 108, height: 52, rotation: -0.030, label: "HIGH LEFT" }),
  "top-centre": Object.freeze({ asset: "keeperReady", x: 282, y: 334, width: 40, height: 104, rotation: 0, label: "HIGH CENTRE" }),
  "top-right": Object.freeze({ asset: "keeperHighRight", x: 301, y: 320, width: 108, height: 52, rotation: 0.030, label: "HIGH RIGHT" }),
  "bottom-left": Object.freeze({ asset: "keeperLowLeft", x: 116, y: 426, width: 104, height: 48, rotation: -0.016, label: "LOW LEFT" }),
  "bottom-centre": Object.freeze({ asset: "keeperReady", x: 284, y: 388, width: 39, height: 92, rotation: 0, label: "LOW CENTRE", scaleX: 1.02, scaleY: 0.92 }),
  "bottom-right": Object.freeze({ asset: "keeperLowRight", x: 305, y: 424, width: 104, height: 48, rotation: 0.016, label: "LOW RIGHT" })
});

export function singleAngleShotMove(zoneId = "bottom-centre") {
  return SINGLE_ANGLE_SHOT_MOVES[zoneId] || SINGLE_ANGLE_SHOT_MOVES["bottom-centre"];
}

export function singleAngleKeeperMove(zoneId = "bottom-centre") {
  return SINGLE_ANGLE_KEEPER_MOVES[zoneId] || SINGLE_ANGLE_KEEPER_MOVES["bottom-centre"];
}

export function broadcastMissPoint(zoneId = "bottom-centre", replay = {}) {
  const parity = Number(replay.kickIndex || 0) % 2 === 0 ? -1 : 1;
  const points = {
    "top-left": { x: 172, y: 258, label: "CLIPS THE BAR" },
    "top-centre": { x: 304, y: 246, label: "OVER THE BAR" },
    "top-right": { x: 447, y: 252, label: "CLIPS THE BAR" },
    "bottom-left": { x: 42, y: 500, label: "DRAGS IT WIDE" },
    "bottom-centre": { x: parity < 0 ? 52 : 470, y: 510, label: "SCUFFED WIDE" },
    "bottom-right": { x: 476, y: 438, label: "PUSHES IT WIDE" }
  };
  return points[zoneId] || points["bottom-centre"];
}

// 0.9H5A freezes the user-marked target geometry and concentrates only on
// broadcast motion: grounded run-up, boot contact, keeper launch/extension,
// physical ball response, landing, and a delayed result reveal.
export const PENALTY_BROADCAST_FINALIZATION = Object.freeze({
  approachStart: 0.018,
  plantStart: REPLAY_TIMELINE.plantStart,
  bootContactWidth: 0.022,
  followBlend: 0.145,
  keeperLandingStartOffset: 0.050,
  resultSafetyGap: REPLAY_TIMELINE.resultReveal - REPLAY_TIMELINE.goalPlane
});

function quadraticPoint(start, control, end, t) {
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
  };
}

function quadraticDerivative(start, control, end, t) {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y)
  };
}

export function singleAngleStrikerState(replay = {}, progress = 0, final = false) {
  const p = clamp(progress, 0, 1);
  const strike = REPLAY_TIMELINE.strike;
  const zoneId = canonicalPenaltyZone(replay, "shotZone");
  const move = singleAngleShotMove(zoneId);
  const rawApproach = final ? 1 : clamp(
    (p - PENALTY_BROADCAST_FINALIZATION.approachStart) /
      Math.max(0.001, strike - PENALTY_BROADCAST_FINALIZATION.approachStart),
    0,
    1
  );
  const approachT = 1 - Math.pow(1 - rawApproach, 2.05);
  const plantT = final ? 1 : smoothstep(clamp(
    (p - PENALTY_BROADCAST_FINALIZATION.plantStart) /
      Math.max(0.001, strike - PENALTY_BROADCAST_FINALIZATION.plantStart),
    0,
    1
  ));
  const followT = final ? 1 : smoothstep(clamp(
    (p - strike + 0.004) / PENALTY_BROADCAST_FINALIZATION.followBlend,
    0,
    1
  ));
  const recoveryT = final ? 1 : smoothstep(clamp((p - strike - 0.105) / 0.205, 0, 1));

  // The plant foot follows a shallow curve on the photographed pitch plane.
  // Body size and lean change around this anchor, never around the sprite centre.
  const startFoot = { x: 1160, y: 602 };
  const controlFoot = { x: 1042, y: 585 };
  const contactFoot = {
    x: 889 + move.translateX * 0.22,
    y: 548 + move.translateY * 0.08
  };
  const foot = quadraticPoint(startFoot, controlFoot, contactFoot, approachT);
  const stride = Math.sin(rawApproach * Math.PI * 3.25) * (1 - plantT) * 0.9;
  foot.x += stride * 1.3;
  foot.y += Math.abs(stride) * 0.45;

  const contactWidth = lerp(38, 54, approachT);
  const contactHeight = lerp(84, 120, approachT);
  const contactOrigin = { x: 0.69, y: 0.98 };
  const plantCompression = plantT * (1 - followT);
  const contactEnvelope = Math.exp(-Math.pow(
    (p - strike) / PENALTY_BROADCAST_FINALIZATION.bootContactWidth,
    2
  ));

  const followWidth = lerp(46, 42, recoveryT);
  const followHeight = lerp(116, 108, recoveryT);
  const followOrigin = { x: 0.62, y: 0.98 };
  const followFoot = {
    x: contactFoot.x + recoveryT * 5,
    y: contactFoot.y + recoveryT * 2
  };

  return {
    p,
    zoneId,
    move,
    rawApproach,
    approachT,
    plantT,
    followT,
    recoveryT,
    contactEnvelope,
    foot,
    contact: {
      x: foot.x - contactWidth * contactOrigin.x,
      y: foot.y - contactHeight * contactOrigin.y,
      width: contactWidth,
      height: contactHeight,
      originX: contactOrigin.x,
      originY: contactOrigin.y,
      alpha: 1 - followT,
      rotation: move.rotation * (0.06 + approachT * 0.30) - plantCompression * 0.010,
      scaleX: 1 + plantCompression * 0.018,
      scaleY: 1 - plantCompression * 0.032
    },
    follow: {
      x: followFoot.x - followWidth * followOrigin.x,
      y: followFoot.y - followHeight * followOrigin.y,
      width: followWidth,
      height: followHeight,
      originX: followOrigin.x,
      originY: followOrigin.y,
      alpha: followT,
      rotation: move.rotation * 0.52 + recoveryT * move.rotation * 0.12,
      scaleX: move.followScaleX * (1 - recoveryT * 0.012),
      scaleY: move.followScaleY * (1 + recoveryT * 0.006)
    }
  };
}

export function broadcastMissImpactKind(zoneId = "bottom-centre") {
  if (zoneId === "top-left" || zoneId === "top-right") return "frame";
  if (zoneId === "top-centre") return "over";
  return "wide";
}

export function singleAngleBallState(replay = {}, progress = 0) {
  const p = clamp(progress, 0, 1);
  const outcome = replay.outcome || "miss";
  const strike = REPLAY_TIMELINE.strike;
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const zoneId = canonicalPenaltyZone(replay, "shotZone");
  const move = singleAngleShotMove(zoneId);
  const effect = penaltyZoneEffect(zoneId);
  const start = BROADCAST_SELECTION_POINTS.ball;
  const target = outcome === "miss"
    ? broadcastMissPoint(zoneId, replay)
    : { ...BROADCAST_SELECTION_POINTS.zones[zoneId], label: zoneLabel(zoneId) };
  const rawFlightT = clamp((p - strike) / Math.max(0.001, contact - strike), 0, 1);
  const flightT = naturalBallFlightEasing(rawFlightT);
  const control = {
    x: start.x + (target.x - start.x) * 0.49 + move.bend * 0.72,
    y: Math.min(start.y, target.y) - move.arc * (zoneId.startsWith("top") ? 0.80 : 0.64)
  };
  const base = quadraticPoint(start, control, target, flightT);
  const derivative = quadraticDerivative(start, control, target, flightT);
  let x = base.x;
  let y = base.y;
  let radius = lerp(12.0, 8.1, Math.pow(flightT, 0.82));
  let rotation = flightT * Math.PI * (14.5 + Math.abs(move.bend) / 12) * (move.bend < 0 ? -1 : 1);
  let velocityX = derivative.x / Math.max(0.001, contact - strike);
  let velocityY = derivative.y / Math.max(0.001, contact - strike);
  const settleT = smoothstep(clamp((p - contact) / Math.max(0.001, 1 - contact), 0, 1));
  const missImpactKind = outcome === "miss" ? broadcastMissImpactKind(zoneId) : "";

  if (p >= contact) {
    if (outcome === "goal") {
      const side = effect.side || 1;
      const damping = Math.exp(-settleT * 3.4);
      x = target.x + Math.sin(settleT * Math.PI * 3.2) * side * 5.5 * damping;
      y = target.y
        + settleT * (zoneId.startsWith("top") ? 32 : 17)
        - Math.sin(settleT * Math.PI * 2.4) * 4.5 * damping;
      radius = lerp(8.1, 7.15, settleT);
      rotation += settleT * Math.PI * 2.1 * side;
      velocityX = side * 42 * damping;
      velocityY = 55 * (1 - damping * 0.35);
    } else if (outcome === "save") {
      const side = effect.side || (Number(replay.kickIndex || 0) % 2 ? 1 : -1);
      const end = {
        x: clamp(target.x - side * 205, 56, 1224),
        y: clamp(target.y + (zoneId.startsWith("top") ? 150 : 96), 90, 676)
      };
      const c2 = {
        x: target.x - side * 78,
        y: target.y - (zoneId.startsWith("top") ? 8 : 18)
      };
      const rebound = quadraticPoint(target, c2, end, settleT);
      const reboundVelocity = quadraticDerivative(target, c2, end, settleT);
      x = rebound.x;
      y = rebound.y;
      radius = lerp(8.1, 9.4, settleT);
      rotation += settleT * Math.PI * 7.0 * -side;
      velocityX = reboundVelocity.x;
      velocityY = reboundVelocity.y;
    } else if (missImpactKind === "frame") {
      const side = effect.side || 1;
      const end = {
        x: clamp(target.x - side * 130, 60, 1220),
        y: clamp(target.y + 178, 80, 680)
      };
      const c2 = { x: target.x - side * 58, y: target.y - 18 };
      const rebound = quadraticPoint(target, c2, end, settleT);
      const reboundVelocity = quadraticDerivative(target, c2, end, settleT);
      x = rebound.x;
      y = rebound.y;
      radius = lerp(8.1, 9.8, settleT);
      rotation += settleT * Math.PI * 8.4 * -side;
      velocityX = reboundVelocity.x;
      velocityY = reboundVelocity.y;
    } else if (missImpactKind === "over") {
      x = lerp(target.x, target.x + (Number(replay.kickIndex || 0) % 2 ? 18 : -18), settleT);
      y = lerp(target.y, target.y - 112, settleT);
      radius = lerp(8.1, 6.7, settleT);
      rotation += settleT * Math.PI * 6.2;
      velocityX = Number(replay.kickIndex || 0) % 2 ? 18 : -18;
      velocityY = -112;
    } else {
      const side = effect.side || (Number(replay.kickIndex || 0) % 2 ? 1 : -1);
      x = lerp(target.x, clamp(target.x + side * 165, 12, 1268), settleT);
      y = lerp(target.y, clamp(target.y + 38, 20, 690), settleT);
      radius = lerp(8.1, 6.9, settleT);
      rotation += settleT * Math.PI * 6.0 * side;
      velocityX = side * 165;
      velocityY = 38;
    }
  }

  const shadowY = lerp(548, zoneId.startsWith("top") ? 500 : 516, flightT);
  const velocity = Math.hypot(velocityX, velocityY);
  const velocityAngle = Math.atan2(velocityY, velocityX);
  const contactCompression = outcome === "save"
    ? Math.exp(-Math.pow((p - contact) / 0.018, 2))
    : 0;

  return {
    progress: p,
    outcome,
    strike,
    contact,
    zoneId,
    move,
    effect,
    start,
    target,
    control,
    rawFlightT,
    flightT,
    settleT,
    missImpactKind,
    x,
    y,
    radius,
    rotation,
    velocity,
    velocityAngle,
    contactCompression,
    visible: p >= strike - 0.003,
    shadow: {
      x: lerp(start.x, target.x, flightT),
      y: shadowY,
      radiusX: lerp(12, 5.6, flightT),
      radiusY: lerp(3.4, 1.8, flightT),
      opacity: clamp(0.19 - Math.max(0, shadowY - y) / 920, 0.022, 0.17)
    }
  };
}

export function singleAngleKeeperState(replay = {}, progress = 0) {
  const p = clamp(progress, 0, 1);
  const zoneId = canonicalPenaltyZone(replay, "keeperZone");
  const move = singleAngleKeeperMove(zoneId);
  const effect = penaltyZoneEffect(zoneId);
  const outcome = replay.outcome || "miss";
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const anticipation = smoothstep(clamp(
    (p - REPLAY_TIMELINE.anticipationStart) /
      Math.max(0.001, REPLAY_TIMELINE.keeperTakeoff - REPLAY_TIMELINE.anticipationStart),
    0,
    1
  ));
  const rawDiveT = clamp(
    (p - REPLAY_TIMELINE.keeperTakeoff) /
      Math.max(0.001, contact - REPLAY_TIMELINE.keeperTakeoff),
    0,
    1
  );
  const pushOff = smoothstep(clamp(rawDiveT / 0.22, 0, 1));
  const extension = 1 - Math.pow(1 - rawDiveT, 2.25);
  const landingStart = contact + PENALTY_BROADCAST_FINALIZATION.keeperLandingStartOffset;
  const landing = smoothstep(clamp(
    (p - landingStart) / Math.max(0.001, REPLAY_TIMELINE.settleStart - landingStart),
    0,
    1
  ));
  const direction = effect.side;
  return {
    p,
    zoneId,
    move,
    effect,
    contact,
    anticipation,
    pushOff,
    rawDiveT,
    diveT: extension,
    extension,
    landing,
    airborne: rawDiveT > 0 && landing < 0.72,
    direction,
    crouch: Math.sin(anticipation * Math.PI * 0.5) * (1 - pushOff * 0.55),
    readyAlpha: 1 - smoothstep(clamp((rawDiveT - 0.02) / 0.30, 0, 1)),
    moveAlpha: smoothstep(clamp((rawDiveT - 0.025) / 0.30, 0, 1))
  };
}

export class PenaltyVisualPack {
  constructor({ assets = PENALTY_VISUAL_ASSETS } = {}) {
    this.assets = assets;
    this.images = new Map();
    this.enabled = typeof Image !== "undefined";
    if (this.enabled) this.preload();
  }

  preload() {
    const paths = [
      this.assets.environment.crowd,
      this.assets.environment.pitch,
      this.assets.establishing,
      ...this.assets.striker,
      ...this.assets.keeper,
      ...Object.values(this.assets.outcome),
      ...Object.values(this.assets.singleAngle || {})
    ];
    paths.forEach(path => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = path;
      this.images.set(path, image);
    });
  }

  get(path) {
    const image = this.images.get(path);
    return image && image.complete && image.naturalWidth > 0 ? image : null;
  }

  ready() {
    return Boolean(
      this.get(this.assets.singleAngle?.selectionBackground) &&
      this.get(this.assets.singleAngle?.background) &&
      this.get(this.assets.singleAngle?.strikerContact) &&
      this.get(this.assets.singleAngle?.strikerFollow) &&
      this.get(this.assets.singleAngle?.keeperReady) &&
      this.get(this.assets.singleAngle?.ball)
    );
  }

  drawSelection(ctx, { role = "striker", preview = null, active = true, time = 0 } = {}) {
    if (!this.enabled) return false;
    const image = this.get(this.assets.singleAngle?.selectionBackground);
    if (!image) {
      this.drawLoadingFrame(ctx);
      return false;
    }

    // 0.9H4B: the exact uploaded broadcast photograph is authoritative even
    // before the kick. No legacy striker photograph or alternate camera may
    // initialize the penalty scene.
    this.drawFullFrame(ctx, image, 1, {
      zoom: 1,
      panX: 0,
      panY: 0,
      label: "PENALTY · BROADCAST CAMERA"
    });

    // Keep the goal mouth legible below the interactive buttons.
    ctx.save();
    const goalGlow = ctx.createRadialGradient(232, 382, 55, 232, 382, 285);
    goalGlow.addColorStop(0, "rgba(255,255,255,.035)");
    goalGlow.addColorStop(0.58, "rgba(0,0,0,0)");
    goalGlow.addColorStop(1, "rgba(0,0,0,.16)");
    ctx.fillStyle = goalGlow;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    if (preview) this.drawSelectionGuide(ctx, role, preview, active, time);
    this.drawSceneBadge(ctx, role === "keeper" ? "CHOOSE THE DIVE" : "CHOOSE THE SHOT");
    return true;
  }

  drawLoadingFrame(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "#07101d");
    gradient.addColorStop(0.55, "#111d29");
    gradient.addColorStop(1, "#17331f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "900 25px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Loading the realistic stadium…", 640, 356);
    ctx.fillStyle = "rgba(255,255,255,.58)";
    ctx.font = "700 16px system-ui";
    ctx.fillText("The turn remains secure while the scene prepares.", 640, 390);
  }

  drawSelectionGuide(ctx, role, zoneId, active, time) {
    const target = BROADCAST_SELECTION_POINTS.zones[zoneId] || BROADCAST_SELECTION_POINTS.zones["bottom-centre"];
    const start = role === "keeper" ? BROADCAST_SELECTION_POINTS.keeper : BROADCAST_SELECTION_POINTS.ball;
    const colour = active ? "#ffd85d" : "#ff7777";
    const pulse = 0.5 + Math.sin(time * 0.006) * 0.12;

    ctx.save();
    ctx.lineCap = "round";
    ctx.setLineDash([13, 10]);
    ctx.lineDashOffset = -time * 0.025;
    ctx.strokeStyle = active ? "rgba(255,216,93,.94)" : "rgba(255,119,119,.9)";
    ctx.lineWidth = role === "keeper" ? 6 : 5;
    ctx.shadowColor = active ? "rgba(255,216,93,.65)" : "rgba(255,119,119,.55)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    const controlX = role === "keeper" ? (start.x + target.x) / 2 : start.x + (target.x - start.x) * 0.43;
    const controlY = role === "keeper" ? Math.min(start.y, target.y) - 70 : Math.min(start.y, target.y) - 115;
    ctx.quadraticCurveTo(controlX, controlY, target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.76 + pulse * 0.22;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 28 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSceneBadge(ctx, label) {
    ctx.save();
    ctx.fillStyle = "rgba(4,9,18,.74)";
    roundRect(ctx, 1000, 28, 242, 44, 13);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.font = "900 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(label, 1121, 56);
    ctx.restore();
  }


  drawEnvironment(ctx, time = 0) {
    const crowd = this.get(this.assets.environment.crowd);
    let used = false;

    if (crowd) {
      used = true;
      ctx.save();
      ctx.globalAlpha = 0.98;
      const drift = Math.sin(time * 0.00018) * 5;
      ctx.drawImage(crowd, -8 + drift, -4, 1296, 352);
      const shade = ctx.createLinearGradient(0, 0, 0, 365);
      shade.addColorStop(0, "rgba(3,7,17,.06)");
      shade.addColorStop(0.62, "rgba(4,10,22,.18)");
      shade.addColorStop(1, "rgba(3,15,19,.60)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 1280, 365);
      ctx.restore();
    }

    return used;
  }

  drawPitchTexture(ctx) {
    const pitch = this.get(this.assets.environment.pitch);
    if (!pitch) return false;
    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.globalCompositeOperation = "soft-light";
    ctx.drawImage(pitch, 0, 330, 1280, 390);
    ctx.restore();
    return true;
  }

  drawCinematic(ctx, replay, time = 0, reducedMotion = false, viewerRole = PENALTY_VIEWERS.STRIKER) {
    // 0.9H4 deliberately ignores the signed viewer camera. The role remains
    // part of delivery/security, but both players watch the same fixed angle.
    return this.drawSingleAngleCinematic(ctx, replay, time, reducedMotion, false);
  }

  drawSingleAngleCinematic(ctx, replay, time = 0, reducedMotion = false, final = false) {
    if (!replay || !this.enabled) return false;
    const progress = final ? 1 : clamp(replay.progress || 0, 0, 1);
    const strike = REPLAY_TIMELINE.strike;
    const shotZone = canonicalPenaltyZone(replay, "shotZone");
    const shotMove = singleAngleShotMove(shotZone);
    const background = this.get(this.assets.singleAngle?.background);
    const contactSprite = this.get(this.assets.singleAngle?.strikerContact);
    const followSprite = this.get(this.assets.singleAngle?.strikerFollow);
    const readySprite = this.get(this.assets.singleAngle?.keeperReady);
    if (!background || !contactSprite || !followSprite || !readySprite) return false;

    // One uninterrupted broadcast plate: no black cut, no alternate camera.
    this.drawFullFrame(ctx, background, 1, { zoom: 1, panX: 0, panY: 0, label: "PENALTY REPLAY · BROADCAST CAMERA" });

    const keeperState = singleAngleKeeperState(replay, progress);
    this.drawSingleAngleKeeper(ctx, keeperState, time, reducedMotion);

    const striker = singleAngleStrikerState(replay, progress, final);
    // The shadow is solved from the same plant-foot anchor as the sprite. It
    // narrows at contact and expands only during the grounded follow-through.
    ctx.save();
    ctx.globalAlpha = 0.12 + striker.approachT * 0.075;
    ctx.fillStyle = "rgba(0,0,0,.76)";
    ctx.filter = "blur(3px)";
    ctx.beginPath();
    ctx.ellipse(
      striker.foot.x,
      striker.foot.y + 2,
      lerp(13, 22, striker.approachT) * (1 - striker.plantT * 0.08),
      lerp(3.6, 4.4, striker.approachT),
      -0.08,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();

    if (striker.contact.alpha > 0.01) {
      this.drawSingleAngleSprite(ctx, contactSprite, striker.contact);
    }
    if (striker.follow.alpha > 0.01) {
      this.drawSingleAngleSprite(ctx, followSprite, striker.follow);
    }

    // Boot contact uses tiny turf flecks and compression only—no flash, target
    // pointer, or comic burst.
    if (!reducedMotion && striker.contactEnvelope > 0.035) {
      const contactStrength = striker.contactEnvelope;
      ctx.save();
      ctx.fillStyle = "rgba(210,225,191,.72)";
      ctx.globalAlpha = contactStrength * 0.62;
      for (let index = 0; index < 7; index += 1) {
        const angle = -2.85 + index * 0.19;
        const distance = 5 + index * 1.7;
        const size = 0.8 + (index % 3) * 0.45;
        ctx.beginPath();
        ctx.ellipse(
          BROADCAST_SELECTION_POINTS.ball.x + Math.cos(angle) * distance,
          BROADCAST_SELECTION_POINTS.ball.y + 5 + Math.sin(angle) * distance * 0.42,
          size * 1.5,
          size,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    }

    const ball = singleAngleBallState(replay, progress);
    if (ball.visible) {
      this.drawBallShadow(ctx, ball.shadow.x, ball.shadow.y, ball.shadow.radiusX, ball.shadow.radiusY, ball.shadow.opacity);
      if (!reducedMotion && progress < ball.contact && ball.rawFlightT > 0.08) {
        this.drawBallMotionBlur(ctx, ball, 0.075);
      }
      this.drawBallMarker(ctx, ball.x, ball.y, ball.radius, ball.rotation, {
        glow: false,
        scaleX: 1 + ball.contactCompression * 0.12,
        scaleY: 1 - ball.contactCompression * 0.095
      });
    }

    if (replay.outcome === "goal" && progress >= ball.contact) {
      this.drawIntegratedNetRipple(ctx, ball.target, penaltyZoneEffect(shotZone), ball.settleT, time, final, shotZone);
    }

    const badge = final ? 1 : smoothstep(clamp((progress - REPLAY_TIMELINE.resultReveal) / 0.075, 0, 1));
    if (badge > 0.01) this.drawOutcomeBanner(ctx, replay, ball.target.label || zoneLabel(shotZone), badge);
    return true;
  }

  drawSingleAngleKeeper(ctx, state, time = 0, reducedMotion = false) {
    const ready = this.get(this.assets.singleAngle?.keeperReady);
    const target = this.get(this.assets.singleAngle?.[state.move.asset]);
    if (!ready || !target) return;

    const start = { x: 288, y: 342, width: 38, height: 102 };
    const t = reducedMotion ? (state.p >= REPLAY_TIMELINE.strike ? 1 : 0) : state.extension;
    const direction = state.direction || 0;
    const anticipationShift = direction * state.anticipation * 4.5;
    const launchLift = Math.sin(Math.min(1, t) * Math.PI) * (state.zoneId.startsWith("top") ? 13 : 7);
    const landingDrop = state.landing * (state.zoneId.startsWith("top") ? 9 : 6);
    const x = lerp(start.x, state.move.x, t) + anticipationShift;
    const y = lerp(start.y, state.move.y, t) - launchLift + landingDrop;
    const widthLimit = state.move.asset === "keeperReady" ? BROADCAST_PLAYER_SCALE_LIMITS.keeperReady.maxWidth : BROADCAST_PLAYER_SCALE_LIMITS.keeperDive.maxWidth;
    const width = Math.min(widthLimit, lerp(start.width, state.move.width, t));
    const heightLimit = state.move.asset === "keeperReady" ? BROADCAST_PLAYER_SCALE_LIMITS.keeperReady.maxHeight : BROADCAST_PLAYER_SCALE_LIMITS.keeperDive.maxHeight;
    const height = Math.min(heightLimit, lerp(start.height, state.move.height, t));
    const rotation = lerp(0, state.move.rotation || 0, t) * (1 + state.landing * 0.12);

    const shadowX = lerp(start.x + start.width * 0.5, x + width * 0.5, smoothstep(t));
    const shadowY = state.zoneId.startsWith("top") ? 498 : 510;
    ctx.save();
    ctx.globalAlpha = clamp(0.245 - state.airborne * 0.10 + state.landing * 0.055, 0.09, 0.27);
    ctx.fillStyle = "rgba(0,0,0,.76)";
    ctx.filter = "blur(4px)";
    ctx.beginPath();
    ctx.ellipse(
      shadowX,
      shadowY,
      lerp(17, width * 0.27, t) * (1 + state.landing * 0.12),
      lerp(5, 3.2, t) * (1 + state.landing * 0.20),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();

    if (state.readyAlpha > 0.015) {
      this.drawSingleAngleSprite(ctx, ready, {
        ...start,
        x: start.x + anticipationShift,
        y: start.y + state.crouch * 4,
        alpha: state.readyAlpha,
        scaleX: 1 + state.crouch * 0.025,
        scaleY: 1 - state.crouch * 0.040,
        rotation: direction * state.anticipation * 0.010,
        originX: 0.5,
        originY: 0.92
      });
    }
    if (state.moveAlpha > 0.015) {
      this.drawSingleAngleSprite(ctx, target, {
        x,
        y,
        width,
        height,
        alpha: state.moveAlpha,
        rotation,
        scaleX: state.move.scaleX || 1,
        scaleY: state.move.scaleY || 1,
        originX: 0.5,
        originY: 0.55
      });
    }
  }

  drawSingleAngleSprite(ctx, image, { x, y, width, height, alpha = 1, rotation = 0, scaleX = 1, scaleY = 1, originX = 0.5, originY = 0.5 } = {}) {
    if (!image || alpha <= 0) return;
    // Hard safety cap: movement is translation/pose change, never whole-player
    // enlargement. This also prevents malformed cached assets from filling the frame.
    const safeWidth = clamp(Number(width) || 1, 1, 112);
    const safeHeight = clamp(Number(height) || 1, 1, 124);
    const safeScaleX = clamp(Number(scaleX) || 1, 0.82, 1.08);
    const safeScaleY = clamp(Number(scaleY) || 1, 0.82, 1.08);
    const anchorX = x + safeWidth * originX;
    const anchorY = y + safeHeight * originY;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(anchorX, anchorY);
    ctx.rotate(clamp(rotation, -0.18, 0.18));
    ctx.scale(safeScaleX, safeScaleY);
    ctx.drawImage(image, -safeWidth * originX, -safeHeight * originY, safeWidth, safeHeight);
    ctx.restore();
  }

  drawStrikerCinematic(ctx, replay, time = 0, reducedMotion = false) {
    if (!replay || !this.enabled) return false;
    const progress = clamp(replay.progress || 0, 0, 1);
    const outcome = replay.outcome || "miss";
    const strike = REPLAY_TIMELINE.strike;
    const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;

    if (reducedMotion) {
      if (progress < strike) {
        const setup = this.get(this.assets.striker[0]);
        if (!setup) return false;
        this.drawFullFrame(ctx, setup, 1, { zoom: 1.008, label: "PENALTY TAKER VIEW" });
        return true;
      }
      const reducedPlan = penaltyOutcomeCameraPlan(replay);
      const reducedImage = this.get(this.assets.outcome[reducedPlan.asset]);
      if (!reducedImage) return false;
      this.drawFullFrame(ctx, reducedImage, 1, { zoom: 1.025, mirror: reducedPlan.mirror, label: `${reducedPlan.label} · TAKER VIEW` });
      this.drawZoneOutcome(ctx, replay, 1, time, { final: true, viewerRole: PENALTY_VIEWERS.STRIKER });
      return true;
    }

    const wideStart = strike + 0.030;
    const keeperCut = Math.max(wideStart + 0.090, contact - 0.125);

    if (progress < wideStart) {
      const runT = clamp((progress - 0.055) / Math.max(0.001, strike - 0.018 - 0.055), 0, 1);
      const sequence = naturalFrameSequence(smoothstep(runT), 5, 0.18);
      const index = progress < 0.055 ? 0 : sequence.index;
      const nextIndex = progress < 0.055 ? 0 : sequence.nextIndex;
      const mix = progress < 0.055 ? 0 : sequence.mix;
      const first = this.get(this.assets.striker[index]) || this.get(this.assets.striker[0]);
      const second = this.get(this.assets.striker[nextIndex]) || first;
      if (!first) return false;
      const contactPulse = Math.exp(-Math.pow((progress - strike) / 0.022, 2));
      this.drawMotionMatchedFullFrame(ctx, first, second, mix, {
        zoom: 1.010 + sequence.position * 0.004 + contactPulse * 0.016,
        panX: lerp(-4, 5, runT),
        panY: lerp(0, -4, runT),
        motionX: lerp(3, 9, runT),
        label: progress < 0.055 ? "PENALTY TAKER VIEW" : visualLabel(index)
      });
      if (progress >= strike - 0.034) this.drawContactPolish(ctx, progress, time);
      return true;
    }

    if (progress < keeperCut) {
      const image = this.get(this.assets.establishing) || this.get(this.assets.striker[0]);
      if (!image) return false;
      const flightT = clamp((progress - wideStart) / Math.max(0.001, keeperCut - wideStart), 0, 1);
      const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
      this.drawFullFrame(ctx, image, 1, {
        zoom: 1.012 + flightT * 0.018,
        panX: -effect.side * flightT * 10,
        panY: -4 - flightT * 4,
        label: "BALL FLIGHT"
      });
      this.eraseEstablishingBall(ctx);
      this.drawCinematicBallFlight(ctx, replay, progress, contact, { start: wideStart, end: contact });
      return true;
    }

    if (progress < contact + 0.040) {
      return this.drawKeeperReactionInset(ctx, replay, progress, contact, time, { fullFrame: true, start: keeperCut });
    }

    const plan = penaltyOutcomeCameraPlan(replay);
    const image = this.get(this.assets.outcome[plan.asset]);
    if (!image) return false;
    const impactT = clamp((progress - contact) / Math.max(0.001, REPLAY_TIMELINE.resultReveal - contact), 0, 1);
    const impactPulse = Math.exp(-Math.pow((progress - contact) / 0.034, 2));
    const effect = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
    this.drawFullFrame(ctx, image, 1, {
      zoom: 1.025 + smoothstep(impactT) * 0.018 + impactPulse * 0.012,
      panX: effect.side * (1 - smoothstep(impactT)) * 7,
      panY: -impactPulse * 5,
      mirror: plan.mirror,
      label: `${plan.label} · TAKER VIEW`
    });
    this.drawZoneOutcome(ctx, replay, impactT, time, { final: false, viewerRole: PENALTY_VIEWERS.STRIKER });
    return true;
  }

  drawKeeperCinematic(ctx, replay, time = 0, reducedMotion = false) {
    if (!replay || !this.enabled) return false;
    return this.drawKeeperNaturalReplay(ctx, replay, clamp(replay.progress || 0, 0, 1), time, reducedMotion, false);
  }

  drawKeeperNaturalReplay(ctx, replay, progress, time = 0, reducedMotion = false, final = false) {
    const state = keeperNaturalActionState(replay, final ? 1 : progress);
    const motionProgress = reducedMotion
      ? (state.progress < state.strike ? 0 : 1)
      : clamp(state.anticipationT * 0.28 + state.diveT * 0.72, 0, 1);
    const motion = keeperMotionPlan(state.keeperZone, motionProgress, state.outcome);
    const first = this.get(this.assets.keeper[motion.fromIndex]) || this.get(this.assets.keeper[0]);
    const second = this.get(this.assets.keeper[motion.toIndex]) || first;
    if (!first) return false;

    const directionLabel = motion.direction < 0 ? "LEFT" : motion.direction > 0 ? "RIGHT" : "CENTRE";
    const label = state.progress < state.strike
      ? "GOALKEEPER REPLAY · SET"
      : state.progress < state.contact
        ? `GOALKEEPER REPLAY · DIVES ${directionLabel}`
        : state.outcome === "save"
          ? "GOALKEEPER REPLAY · CONTACT"
          : `GOALKEEPER REPLAY · ${directionLabel}`;
    const takeoffLift = Math.sin(clamp(state.launchT, 0, 1) * Math.PI) * (1 - state.landingT);
    const followThrough = state.diveT * (1 - state.landingT * 0.34);
    this.drawMotionMatchedFullFrame(ctx, first, second, motion.mix, {
      zoom: 1.004 + followThrough * 0.032,
      panX: motion.direction * followThrough * 16,
      panY: -takeoffLift * 8 + state.landingT * 4,
      motionX: motion.direction * lerp(4, 13, followThrough),
      label
    });

    if (state.outcome === "goal" && state.progress >= state.contact) {
      this.drawIntegratedNetRipple(ctx, state.target, state.effect, state.settleT, time, final, state.zoneId);
    }

    if (state.visible) {
      const shadowY = lerp(650, state.effect.level === "high" ? 520 : 538, state.flightT);
      const airborne = Math.max(0, shadowY - state.y);
      this.drawBallShadow(
        ctx,
        state.x,
        shadowY,
        lerp(21, 8, state.flightT),
        lerp(5.5, 2.4, state.flightT),
        clamp(0.21 - airborne / 980, 0.038, 0.19)
      );

      if (!reducedMotion && state.progress < state.contact && state.rawFlightT > 0.08) {
        this.drawBallMotionBlur(ctx, state, clamp((1 - state.rawFlightT) * 0.18 + 0.05, 0.045, 0.16));
      }

      const compression = state.outcome === "save" ? state.contactCompression : state.contactCompression * 0.42;
      this.drawBallMarker(ctx, state.x, state.y, state.radius, state.rotation, {
        glow: false,
        scaleX: 1 + compression * 0.16,
        scaleY: 1 - compression * 0.12
      });
    }

    // One photographic goalmouth, one ball and one keeper; no wireframe net patch.
    // No helper target,
    // wireframe patch, comic flash, pointer or detached result illustration.
    const badgeStart = REPLAY_TIMELINE.resultReveal;
    const badge = final ? 1 : smoothstep(clamp((state.progress - badgeStart) / 0.08, 0, 1));
    if (badge > 0.01) this.drawOutcomeBanner(ctx, replay, state.target.label || zoneLabel(canonicalPenaltyZone(replay, "shotZone")), badge);
    return true;
  }

  drawKeeperPovWorld(ctx, replay, progress, time = 0, reducedMotion = false) {
    const crowd = this.get(this.assets.environment.crowd);
    const pitch = this.get(this.assets.environment.pitch);
    if (!crowd || !pitch) return false;
    const outcome = replay.outcome || "miss";
    const strike = REPLAY_TIMELINE.strike;
    const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
    const flightT = clamp((progress - strike) / Math.max(0.001, contact - strike), 0, 1);
    const diveT = clamp((progress - strike + 0.010) / Math.max(0.001, contact - strike + 0.08), 0, 1);
    const shotPoint = penaltyActionImpactPointForViewer(replay, PENALTY_VIEWERS.KEEPER);
    const keeperPoint = KEEPER_POV_POINTS.zones[zoneForCamera(replay, { field: "keeperZone", cameraRole: PENALTY_VIEWERS.KEEPER })] || KEEPER_POV_POINTS.zones["bottom-centre"];
    const camera = keeperCameraFrame({
      progress,
      outcome,
      target: shotPoint,
      keeperTarget: keeperPoint,
      reducedMotion,
      viewerRole: PENALTY_VIEWERS.KEEPER
    });

    ctx.save();
    ctx.translate(640 + (camera.translateX || 0), 360 + (camera.translateY || 0));
    ctx.rotate(camera.rotation || 0);
    ctx.scale(camera.scale || 1, camera.scale || 1);
    ctx.translate(-640, -360);
    this.drawKeeperPovBackground(ctx, crowd, pitch, time);
    this.drawKeeperPovStriker(ctx, progress, time);

    if (progress < strike) {
      this.drawBallMarker(ctx, KEEPER_POV_POINTS.ball.x, KEEPER_POV_POINTS.ball.y, 6.5, time * 0.002, { glow: false });
    } else if (progress <= contact + 0.012) {
      const state = keeperPerspectiveBallState(replay, flightT);
      const ghost = keeperPerspectiveBallState(replay, Math.max(0, flightT - 0.075));
      if (!reducedMotion && flightT > 0.10) {
        ctx.save();
        ctx.globalAlpha = 0.10;
        this.drawBallMarker(ctx, ghost.x, ghost.y, ghost.radius * 0.86, ghost.rotation, { glow: false });
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = state.shadow.opacity;
      ctx.fillStyle = "rgba(0,0,0,.78)";
      ctx.filter = "blur(4px)";
      ctx.beginPath();
      ctx.ellipse(state.shadow.x, state.shadow.y, state.shadow.radiusX, state.shadow.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = "none";
      ctx.restore();
      this.drawBallMarker(ctx, state.x, state.y, state.radius, state.rotation, {
        scaleX: state.squashX,
        scaleY: state.squashY,
        glow: false
      });
    }

    this.drawKeeperPovGloves(ctx, replay, diveT, progress, contact, time);

    if (progress > contact) {
      const impactT = clamp((progress - contact) / Math.max(0.001, REPLAY_TIMELINE.resultReveal - contact), 0, 1);
      this.drawKeeperPovOutcome(ctx, replay, impactT, time);
    }
    ctx.restore();

    this.drawFrameGradeAndLabel(ctx, 1, perspectiveLabel(PENALTY_VIEWERS.KEEPER));
    // 0.9H2A: keeper POV cuts directly to the physical outcome. No white
    // impact flash or comic-style transition is drawn over the incoming ball.
    return true;
  }

  drawKeeperPovBackground(ctx, crowd, pitch, time = 0) {
    ctx.save();
    ctx.drawImage(crowd, 0, 0, 1280, 420);
    const crowdShade = ctx.createLinearGradient(0, 0, 0, 430);
    crowdShade.addColorStop(0, "rgba(2,5,14,.12)");
    crowdShade.addColorStop(1, "rgba(2,7,16,.72)");
    ctx.fillStyle = crowdShade;
    ctx.fillRect(0, 0, 1280, 430);

    ctx.drawImage(pitch, 0, 290, 1280, 430);
    const grass = ctx.createLinearGradient(0, 292, 0, 720);
    grass.addColorStop(0, "rgba(37,89,43,.18)");
    grass.addColorStop(1, "rgba(10,45,28,.38)");
    ctx.fillStyle = grass;
    ctx.fillRect(0, 290, 1280, 430);

    ctx.strokeStyle = "rgba(238,244,239,.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(510, 410); ctx.lineTo(84, 720);
    ctx.moveTo(770, 410); ctx.lineTo(1196, 720);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(640, 403, 104, 27, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,247,242,.86)";
    ctx.beginPath(); ctx.arc(640, 405, 4, 0, Math.PI * 2); ctx.fill();

    // Goal-frame edges anchor the camera on the goalkeeper's line.
    const frameGlow = 0.82 + Math.sin(time * 0.002) * 0.03;
    ctx.globalAlpha = frameGlow;
    ctx.strokeStyle = "rgba(244,249,250,.94)";
    ctx.lineWidth = 17;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(24, 82); ctx.lineTo(24, 720);
    ctx.moveTo(1256, 82); ctx.lineTo(1256, 720);
    ctx.moveTo(24, 82); ctx.lineTo(1256, 82);
    ctx.stroke();
    ctx.restore();
  }

  drawKeeperPovStriker(ctx, progress, time = 0) {
    const strike = REPLAY_TIMELINE.strike;
    const runT = smoothstep(clamp((progress - 0.055) / Math.max(0.001, strike - 0.055), 0, 1));
    const contact = Math.exp(-Math.pow((progress - strike) / 0.022, 2));
    const x = lerp(678, 640, runT);
    const y = lerp(344, 358, runT);
    const scale = lerp(0.72, 1, runT);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const lean = lerp(-0.10, 0.16, runT) - contact * 0.08;
    ctx.rotate(lean);
    ctx.fillStyle = "rgba(5,9,20,.32)";
    ctx.beginPath(); ctx.ellipse(0, 61, 33, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d59a72";
    ctx.beginPath(); ctx.arc(0, -40, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2b58";
    roundRect(ctx, -15, -31, 30, 46, 9); ctx.fill();
    ctx.strokeStyle = "#172347";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 10); ctx.lineTo(-16 - runT * 7, 45);
    ctx.moveTo(8, 10); ctx.lineTo(18 + contact * 16, 46 - contact * 8);
    ctx.stroke();
    ctx.strokeStyle = "#d59a72";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-12, -20); ctx.lineTo(-26, -2 + Math.sin(time * 0.006) * 2);
    ctx.moveTo(12, -20); ctx.lineTo(27, -5);
    ctx.stroke();
    ctx.restore();
  }

  drawKeeperPovGloves(ctx, replay, rawDiveT, progress, contact, time = 0) {
    const dive = keeperPerspectiveDivePoint(canonicalPenaltyZone(replay, "keeperZone"), rawDiveT);
    const viewed = penaltyZoneEffect(dive.viewedZone);
    const leadX = lerp(viewed.side < 0 ? 420 : viewed.side > 0 ? 860 : 640, dive.x, dive.t);
    const leadY = lerp(694, dive.y, dive.t);
    const trailX = lerp(viewed.side < 0 ? 850 : viewed.side > 0 ? 430 : 760, 640 + viewed.side * 160, dive.t * 0.72);
    const trailY = lerp(714, 618 - (viewed.level === "high" ? 70 : 0), dive.t * 0.72);
    const contactPulse = replay.outcome === "save"
      ? Math.exp(-Math.pow((progress - contact) / 0.030, 2))
      : 0;
    this.drawPovGlove(ctx, trailX, trailY, viewed.side * 0.28, 0.74 + dive.t * 0.12, false);
    this.drawPovGlove(ctx, leadX, leadY, viewed.side * 0.48, 0.92 + dive.t * 0.34 + contactPulse * 0.16, true);
    if (contactPulse > 0.02) this.drawGloveContact(ctx, leadX, leadY, 1 - contactPulse);
  }

  drawPovGlove(ctx, x, y, angle = 0, scale = 1, lead = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = lead ? "#f3f5e8" : "#dfe8dc";
    ctx.strokeStyle = "#27304a";
    ctx.lineWidth = 5;
    roundRect(ctx, -34, -25, 68, 58, 18);
    ctx.fill(); ctx.stroke();
    for (let index = 0; index < 4; index += 1) {
      roundRect(ctx, -29 + index * 15, -52 - (index % 2) * 4, 13, 35, 7);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#58b887";
    roundRect(ctx, -27, 15, 54, 18, 7); ctx.fill();
    ctx.restore();
  }

  drawKeeperPovOutcome(ctx, replay, impactT, time = 0) {
    const point = penaltyActionImpactPointForViewer(replay, PENALTY_VIEWERS.KEEPER);
    const viewedZone = zoneForCamera(replay, { field: "shotZone", cameraRole: PENALTY_VIEWERS.KEEPER });
    const effect = penaltyZoneEffect(viewedZone);
    const age = smoothstep(clamp(impactT, 0, 1));
    if (replay.outcome === "save") {
      const direction = effect.side || (Number(replay.kickIndex || 0) % 2 ? 1 : -1);
      const end = { x: clamp(point.x - direction * 300, 90, 1190), y: clamp(point.y + (effect.level === "high" ? 210 : 126), 110, 650) };
      const x = lerp(point.x, end.x, age);
      const y = lerp(point.y, end.y, age);
      this.drawBallMarker(ctx, x, y, lerp(33, 18, age), time * 0.014 - direction * age * 7);
      return;
    }
    if (replay.outcome === "miss") {
      const end = { x: clamp(point.x + (effect.side || 1) * 180, 18, 1262), y: clamp(point.y + (effect.level === "high" ? -80 : 70), 18, 680) };
      this.drawBallMarker(ctx, lerp(point.x, end.x, age), lerp(point.y, end.y, age), lerp(32, 17, age), time * 0.014 + age * 7);
    }
  }

  drawKeeperLookBack(ctx, replay, time = 0, impactT = 1, final = false) {
    const image = this.get(this.assets.outcome.goal);
    if (!image) return false;

    // This is a cut back to the main pitch camera, not another keeper-space
    // projection. Always re-derive the target from the canonical event so a
    // keeper mirror can never leak into the final frame.
    const mainCameraZone = zoneForCamera(replay, {
      field: "shotZone",
      cameraRole: PENALTY_VIEWERS.STRIKER
    });
    const effect = penaltyZoneEffect(mainCameraZone);
    const point = {
      ...(PENALTY_ACTION_POINTS.zones[mainCameraZone] || PENALTY_ACTION_POINTS.zones["bottom-centre"]),
      label: effect.goal.replaceAll("-", " ")
    };
    this.drawFullFrame(ctx, image, 1, {
      zoom: 1.03 + (final ? Math.sin(time * 0.0012) * 0.002 : smoothstep(impactT) * 0.016),
      mirror: effect.side < 0,
      label: "BROADCAST REPLAY"
    });
    this.drawGoalImpact(ctx, point, effect, final ? 1 : smoothstep(impactT), time, impactT, final);
    const badge = final ? 1 : smoothstep(clamp((impactT - 0.72) / 0.28, 0, 1));
    if (badge > 0.01) this.drawOutcomeBanner(ctx, replay, point.label, badge);
    return true;
  }

  drawResultStill(ctx, replay, time = 0, viewerRole = PENALTY_VIEWERS.STRIKER) {
    if (!replay || !this.enabled) return false;
    return this.drawSingleAngleCinematic(ctx, { ...replay, progress: 1 }, time, true, true);
  }

  drawKeeperResultStill(ctx, replay, time = 0, reducedMotion = false) {
    return this.drawKeeperNaturalReplay(ctx, replay, 1, time, reducedMotion, true);
  }

  drawCinematicBallFlight(ctx, replay, progress, contact, { start = REPLAY_TIMELINE.strike, end = contact } = {}) {
    const rawT = clamp((progress - start) / Math.max(0.001, end - start), 0, 1);
    const state = penaltyBallPolishState(replay, rawT);
    const ghost = penaltyBallPolishState(replay, Math.max(0, rawT - 0.075));

    ctx.save();
    ctx.globalAlpha = state.shadow.opacity;
    ctx.fillStyle = "rgba(0,0,0,.84)";
    ctx.filter = "blur(5px)";
    ctx.beginPath();
    ctx.ellipse(state.shadow.x, state.shadow.y, state.shadow.radiusX, state.shadow.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();

    // 0.9H2: the shaded football tells the story. One faint ghost gives speed without
    // becoming a pointer, target line, radar or detached explanatory graphic.
    if (rawT > 0.10) {
      ctx.save();
      ctx.globalAlpha = 0.055;
      this.drawBallMarker(ctx, ghost.x, ghost.y, ghost.radius * 0.82, ghost.rotation, { glow: false });
      ctx.restore();
    }

    this.drawBallMarker(ctx, state.x, state.y, state.radius, state.rotation, {
      scaleX: state.squashX,
      scaleY: state.squashY,
      glow: false
    });
  }

  drawKeeperReactionInset(ctx, replay, progress, contact, time, { fullFrame = false, start = REPLAY_TIMELINE.keeperTakeoff } = {}) {
    const rawT = clamp((progress - start) / Math.max(0.001, contact - start), 0, 1);
    const motion = keeperMotionPlan(canonicalPenaltyZone(replay, "keeperZone"), rawT, replay.outcome);
    const first = this.get(this.assets.keeper[motion.fromIndex]) || this.get(this.assets.keeper[0]);
    const second = this.get(this.assets.keeper[motion.toIndex]) || first;
    if (!first) return false;
    if (fullFrame) {
      const directionLabel = motion.direction < 0 ? "LEFT" : motion.direction > 0 ? "RIGHT" : "CENTRE";
      this.drawBlendedFullFrame(ctx, first, second, motion.mix, {
        zoom: 1.012 + smoothstep(rawT) * 0.040,
        panX: motion.direction * smoothstep(rawT) * 14,
        panY: -Math.sin(rawT * Math.PI) * 7,
        label: rawT < 0.24 ? "KEEPER SET" : `KEEPER DIVES ${directionLabel}`
      });

      const shot = penaltyZoneEffect(canonicalPenaltyZone(replay, "shotZone"));
      const side = replay.outcome === "save" ? shot.side : shot.side;
      const level = shot.level;
      const end = { x: side < 0 ? 188 : side > 0 ? 1092 : 640, y: level === "high" ? 252 : 472 };
      const startPoint = { x: 640, y: 622 };
      const ballT = smoothstep(rawT);
      const control = { x: (startPoint.x + end.x) / 2, y: Math.min(startPoint.y, end.y) - (level === "high" ? 150 : 85) };
      const u = 1 - ballT;
      const x = u*u*startPoint.x + 2*u*ballT*control.x + ballT*ballT*end.x;
      const y = u*u*startPoint.y + 2*u*ballT*control.y + ballT*ballT*end.y;
      const shadowY = lerp(646, level === "high" ? 526 : 512, ballT);
      ctx.save();
      ctx.globalAlpha = level === "high" ? 0.10 : 0.19;
      ctx.fillStyle = "rgba(0,0,0,.8)";
      ctx.beginPath(); ctx.ellipse(x, shadowY, 18 - ballT * 6, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      this.drawBallMarker(ctx, x, y, 18 - ballT * 4, time * 0.018 * (shot.side || 1));
      if (replay.outcome === "save" && rawT > 0.82) this.drawGloveContact(ctx, x, y, (rawT - 0.82) / 0.18);
      return true;
    }
    return true;
  }
  drawZoneOutcome(ctx, replay, impactT, time, { final = false, viewerRole = PENALTY_VIEWERS.STRIKER } = {}) {
    const role = normalizePenaltyViewer(viewerRole);
    const canonicalZone = canonicalPenaltyZone(replay, "shotZone");
    const viewedZone = zoneForViewer(canonicalZone, role);
    const effect = penaltyZoneEffect(viewedZone);
    const side = effect.side;
    let point;
    if (replay.outcome === "goal") point = { ...(PENALTY_ACTION_POINTS.zones[viewedZone] || PENALTY_ACTION_POINTS.zones["bottom-centre"]), label: effect.goal.replaceAll("-", " ") };
    else if (replay.outcome === "save") point = { x: side < 0 ? 242 : side > 0 ? 1038 : 640, y: effect.level === "high" ? 282 : 478, label: `${effect.level} ${side < 0 ? "left" : side > 0 ? "right" : "centre"} save` };
    else point = role === PENALTY_VIEWERS.KEEPER
      ? penaltyActionImpactPointForViewer(replay, role)
      : penaltyActionImpactPoint(replay);
    const pulse = final ? 1 : smoothstep(clamp(impactT * 1.75, 0, 1));
    if (replay.outcome === "goal") this.drawGoalImpact(ctx, point, effect, pulse, time, impactT, final);
    else if (replay.outcome === "save") this.drawSaveImpact(ctx, point, effect, pulse, time, replay, impactT, final);
    else this.drawMissImpact(ctx, point, effect, pulse, time, replay, impactT, final);
    const badge = final ? 1 : smoothstep(clamp((impactT - 0.78) / 0.22, 0, 1));
    if (badge > 0.01) this.drawOutcomeBanner(ctx, replay, point.label || zoneLabel(viewedZone), badge);
  }

  drawGoalImpact(ctx, point, effect, pulse, time, impactT = 0, final = false) {
    const age = final ? 1 : clamp(impactT, 0, 1);
    const settle = smoothstep(clamp((age - 0.08) / 0.92, 0, 1));
    const oscillation = Math.sin(age * Math.PI * 7.2) * Math.exp(-age * 3.5);
    const depth = pulse * (1 + oscillation * 0.20);
    const spanX = effect.level === "high" ? 82 : 96;
    const spanY = effect.level === "high" ? 58 : 46;
    const pushX = effect.side * (8 + 7 * depth);
    const pushY = 10 + 16 * depth;

    // Net strands bend locally within the photographed goal. The old detached rectangular mini-net is gone.
    // There is no coloured flash or comic starburst.
    ctx.save();
    ctx.globalAlpha = 0.18 + pulse * 0.42;
    ctx.strokeStyle = "rgba(224,229,225,.72)";
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";

    for (let index = -3; index <= 3; index += 1) {
      const offsetX = (index / 3) * spanX;
      ctx.beginPath();
      ctx.moveTo(point.x + offsetX, point.y - spanY);
      ctx.quadraticCurveTo(
        point.x + offsetX * 0.72 + pushX * (1 - Math.abs(index) / 4),
        point.y + pushY,
        point.x + offsetX * 0.94,
        point.y + spanY
      );
      ctx.stroke();
    }

    for (let index = -2; index <= 2; index += 1) {
      const offsetY = (index / 2) * spanY;
      ctx.beginPath();
      ctx.moveTo(point.x - spanX, point.y + offsetY);
      ctx.quadraticCurveTo(
        point.x + pushX,
        point.y + offsetY * 0.72 + pushY * (1 - Math.abs(index) / 3),
        point.x + spanX,
        point.y + offsetY * 0.94
      );
      ctx.stroke();
    }
    ctx.restore();

    if (effect.level === "low") this.drawTurfBurst(ctx, point.x, point.y + 28, pulse);

    // The ball settles into the net with a small real-world drop and shadow.
    const ballX = point.x + effect.side * settle * 16;
    const ballY = point.y + settle * (effect.level === "high" ? 38 : 25)
      + Math.sin(age * Math.PI * 3.5) * (1 - settle) * 5;
    this.drawBallShadow(ctx, ballX + effect.side * 5, ballY + 10, 14, 4, 0.12 + settle * 0.16);
    this.drawBallMarker(ctx, ballX, ballY, lerp(14.5, 12, settle), time * 0.010 + settle * 2.4, { glow: false });
  }
  drawSaveImpact(ctx, point, effect, pulse, time, replay, impactT = 0, final = false) {
    const age = final ? 1 : clamp(impactT, 0, 1);
    const contactAlpha = 1 - smoothstep(clamp((age - 0.24) / 0.34, 0, 1));

    // Brief glove/ball compression replaces the old neon contact ring.
    if (contactAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = contactAlpha * 0.34;
      ctx.fillStyle = "rgba(238,241,231,.92)";
      ctx.beginPath();
      ctx.ellipse(point.x - effect.side * 7, point.y + 2, 24 + pulse * 4, 12 + pulse * 2, effect.side * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const reboundT = smoothstep(clamp((age - 0.14) / 0.86, 0, 1));
    const rebound = penaltySaveDeflectionPoint(replay, reboundT);
    ctx.save();
    ctx.globalAlpha = 0.72 + reboundT * 0.28;
    this.drawBallMarker(ctx, rebound.x, rebound.y, lerp(17, 12.5, reboundT), time * 0.010 + rebound.rotation, { glow: false });
    if (effect.level === "low" && reboundT > 0.52) this.drawTurfBurst(ctx, rebound.x, rebound.y + 15, reboundT);
    ctx.restore();
  }
  drawMissImpact(ctx, point, effect, pulse, time, replay, impactT = 0, final = false) {
    const age = final ? 1 : clamp(impactT, 0, 1);
    if (effect.miss.startsWith("bar")) {
      const frameX = effect.side < 0 ? 284 : 996;
      const frameY = 286;
      const glint = 1 - smoothstep(clamp((age - 0.10) / 0.34, 0, 1));
      ctx.save();
      ctx.globalAlpha = glint * 0.58;
      ctx.strokeStyle = "rgba(250,250,244,.92)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(frameX - 13, frameY);
      ctx.lineTo(frameX + 13, frameY);
      ctx.moveTo(frameX, frameY - 13);
      ctx.lineTo(frameX, frameY + 13);
      ctx.stroke();
      ctx.restore();
    } else if (effect.level === "low") {
      this.drawTurfBurst(ctx, point.x, point.y + 15, pulse);
    }

    const reboundT = smoothstep(clamp((age - 0.12) / 0.88, 0, 1));
    const ball = penaltyMissReboundPoint(replay, reboundT);
    ctx.save();
    ctx.globalAlpha = 0.70 + reboundT * 0.30;
    this.drawBallMarker(ctx, ball.x, ball.y, lerp(16, 11.5, reboundT), time * 0.011 + ball.rotation, { glow: false });
    ctx.restore();
  }
  drawIntegratedNetRipple(ctx, point, effect, rawT = 0, time = 0, final = false, zoneId = "bottom-centre") {
    const profile = netSagProfile(zoneId);
    const t = clamp(rawT, 0, 1);
    const envelope = netSagEnvelope(t, final);
    if (envelope <= 0.012) return;

    const oscillation = final ? 0 : Math.sin(time * 0.022 + t * Math.PI * 8) * Math.exp(-t * 2.2);
    const depth = profile.pocketDepth * envelope;
    const drop = profile.drop * envelope;
    const sidePull = profile.biasX * depth * 0.42;
    const verticalBias = profile.biasY * depth * 0.30;
    const cols = 8;
    const rows = 7;

    // A dim displaced layer makes the net read as a backward pocket rather
    // than a bright diagram laid over the photograph.
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(95,105,96,.48)";
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = clamp(0.10 + envelope * 0.23, 0, 0.34);
    for (let col = 0; col <= cols; col += 1) {
      const nx = col / cols * 2 - 1;
      const influence = Math.exp(-Math.pow(nx / profile.spreadX, 2) * 1.7);
      const x = point.x + nx * profile.spanX;
      ctx.beginPath();
      ctx.moveTo(x, point.y - profile.spanY);
      ctx.quadraticCurveTo(
        x + sidePull * influence + oscillation * 2.2 * influence,
        point.y + drop * influence + verticalBias,
        x + profile.biasX * envelope * 3,
        point.y + profile.spanY + drop * 0.24 * influence
      );
      ctx.stroke();
    }
    for (let row = 0; row <= rows; row += 1) {
      const ny = row / rows * 2 - 1;
      const influence = Math.exp(-Math.pow(ny / profile.spreadY, 2) * 1.65);
      const y = point.y + ny * profile.spanY;
      ctx.beginPath();
      ctx.moveTo(point.x - profile.spanX, y);
      ctx.quadraticCurveTo(
        point.x + sidePull + oscillation * 2.6 * influence,
        y + drop * influence + verticalBias,
        point.x + profile.spanX,
        y + drop * 0.18 * influence
      );
      ctx.stroke();
    }

    // Bright tension strands define the six different pocket shapes.
    ctx.strokeStyle = "rgba(226,232,225,.80)";
    ctx.lineWidth = 0.88;
    ctx.globalAlpha = clamp(0.12 + envelope * 0.34, 0, 0.47);
    for (let col = 1; col < cols; col += 1) {
      const nx = col / cols * 2 - 1;
      const influence = Math.exp(-Math.pow(nx / profile.spreadX, 2) * 2.15);
      const x = point.x + nx * profile.spanX;
      ctx.beginPath();
      ctx.moveTo(x, point.y - profile.spanY);
      ctx.quadraticCurveTo(
        x + sidePull * influence,
        point.y + drop * influence + verticalBias,
        x,
        point.y + profile.spanY
      );
      ctx.stroke();
    }
    for (let row = 1; row < rows; row += 1) {
      const ny = row / rows * 2 - 1;
      const influence = Math.exp(-Math.pow(ny / profile.spreadY, 2) * 2.0);
      const y = point.y + ny * profile.spanY;
      ctx.beginPath();
      ctx.moveTo(point.x - profile.spanX, y);
      ctx.quadraticCurveTo(
        point.x + sidePull,
        y + drop * influence + verticalBias,
        point.x + profile.spanX,
        y
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBallMotionBlur(ctx, state, opacity = 0.10) {
    const speed = clamp(state.velocity / 620, 0, 1);
    if (speed < 0.04 || opacity <= 0) return;
    const length = lerp(6, 20, speed);
    const thickness = Math.max(1.5, state.radius * 0.46);
    ctx.save();
    ctx.globalAlpha = opacity * speed;
    ctx.translate(state.x, state.y);
    ctx.rotate(state.velocityAngle || 0);
    const blur = ctx.createLinearGradient(-length, 0, state.radius * 0.2, 0);
    blur.addColorStop(0, "rgba(232,235,231,0)");
    blur.addColorStop(0.55, "rgba(232,235,231,.18)");
    blur.addColorStop(1, "rgba(245,246,242,.42)");
    ctx.fillStyle = blur;
    ctx.beginPath();
    ctx.ellipse(-length * 0.42, 0, length, thickness, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBallShadow(ctx, x, y, radiusX, radiusY, opacity = 0.18) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.filter = "blur(3px)";
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();
  }

  drawTurfBurst(ctx, x, y, pulse) {
    ctx.save();
    ctx.globalAlpha = 0.16 + clamp(pulse, 0, 1) * 0.26;
    ctx.fillStyle = "rgba(188,205,149,.82)";
    for (let index = 0; index < 10; index += 1) {
      const spread = (index - 4.5) * 5.4;
      const lift = (index % 3) * 2.6 + pulse * (index % 2 ? 4 : 2);
      ctx.beginPath();
      ctx.ellipse(x + spread, y - lift, 1.2 + (index % 2) * 0.7, 0.8, spread * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawBallMarker(ctx, x, y, radius, spin = 0, { scaleX = 1, scaleY = 1, glow = true } = {}) {
    const photographedBall = this.get(this.assets.singleAngle?.ball);
    if (photographedBall) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.scale(scaleX, scaleY);
      const diameter = radius * 2.12;
      ctx.shadowColor = glow ? "rgba(255,255,255,.12)" : "transparent";
      ctx.shadowBlur = glow ? Math.max(1, radius * 0.12) : 0;
      ctx.drawImage(photographedBall, -diameter / 2, -diameter / 2, diameter, diameter);
      ctx.shadowColor = "transparent";
      // Broadcast-light falloff gives the raster ball depth without a neon halo.
      const shade = ctx.createRadialGradient(-radius * 0.34, -radius * 0.38, radius * 0.04, 0, 0, radius * 1.05);
      shade.addColorStop(0, "rgba(255,255,255,.10)");
      shade.addColorStop(0.62, "rgba(255,255,255,0)");
      shade.addColorStop(1, "rgba(0,0,0,.14)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.scale(scaleX, scaleY);

    const shell = ctx.createRadialGradient(
      -radius * 0.34, -radius * 0.42, radius * 0.08,
      0, 0, radius * 1.08
    );
    shell.addColorStop(0, "#ffffff");
    shell.addColorStop(0.48, "#e9e9e4");
    shell.addColorStop(0.82, "#b9bdba");
    shell.addColorStop(1, "#6f7778");
    ctx.fillStyle = shell;
    ctx.shadowColor = glow ? "rgba(255,255,255,.24)" : "transparent";
    ctx.shadowBlur = glow ? Math.max(2, radius * 0.20) : 0;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "rgba(27,32,34,.70)";
    ctx.lineWidth = Math.max(0.8, radius * 0.055);
    ctx.beginPath();
    ctx.arc(0, 0, radius - ctx.lineWidth * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Small rotating panels and seams; deliberately subdued at replay scale.
    ctx.fillStyle = "rgba(31,37,39,.88)";
    ctx.beginPath();
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
      const px = Math.cos(angle) * radius * 0.23;
      const py = Math.sin(angle) * radius * 0.23;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(40,46,48,.54)";
    ctx.lineWidth = Math.max(0.7, radius * 0.045);
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.25, Math.sin(angle) * radius * 0.25);
      ctx.lineTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,.36)";
    ctx.beginPath();
    ctx.ellipse(-radius * 0.30, -radius * 0.34, radius * 0.18, radius * 0.09, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawGloveContact(ctx, x, y, rawT) {
    const t = smoothstep(clamp(rawT, 0, 1));
    const alpha = (1 - t) * 0.46;
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(242,244,235,.88)";
    ctx.beginPath();
    ctx.ellipse(x, y, 26 + t * 7, 11 + t * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(205,212,198,.62)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 20 - t * 8, y + 8);
    ctx.lineTo(x + 19 + t * 7, y - 7);
    ctx.stroke();
    ctx.restore();
  }

  drawContactPolish(ctx, progress, time) {
    const pulse = Math.exp(-Math.pow((progress - REPLAY_TIMELINE.strike) / 0.023, 2));
    if (pulse < 0.015) return;
    this.drawContactFlash(ctx, progress);
    ctx.save();
    ctx.globalAlpha = 0.38 + pulse * 0.42;
    this.drawTurfBurst(ctx, 840, 568, pulse);
    this.drawBallShadow(ctx, 846, 550, 20, 5, pulse * 0.22);
    this.drawBallMarker(ctx, 846 + pulse * 4, 535, 17, time * 0.010, {
      scaleX: 1.10 + pulse * 0.08,
      scaleY: 0.92 - pulse * 0.08,
      glow: false
    });
    ctx.restore();
  }
  drawOutcomeBanner(ctx, replay, detail, opacity) {
    const outcome = replay.outcome || "miss";
    const colour = outcome === "goal" ? "#6ce49a" : outcome === "save" ? "#66e0b0" : "#ff7f7f";
    const title = outcome === "goal" ? "GOAL" : outcome === "save" ? "SAVED" : "MISSED";
    ctx.save(); ctx.globalAlpha = clamp(opacity,0,1);
    ctx.fillStyle="rgba(3,8,17,.86)"; roundRect(ctx,455,30,370,60,16); ctx.fill();
    ctx.strokeStyle=colour; ctx.lineWidth=2.5; roundRect(ctx,455,30,370,60,16); ctx.stroke();
    ctx.fillStyle=colour; ctx.font="1000 21px system-ui"; ctx.textAlign="center"; ctx.fillText(title,640,57);
    ctx.fillStyle="rgba(255,255,255,.90)"; ctx.font="800 12px system-ui"; ctx.fillText(detail.toUpperCase(),640,77); ctx.restore();
  }

  eraseEstablishingBall(ctx) {
    ctx.save();
    const patch = ctx.createRadialGradient(640,626,4,640,626,57);
    patch.addColorStop(0,"rgba(73,108,51,.98)");
    patch.addColorStop(.64,"rgba(68,102,47,.96)");
    patch.addColorStop(1,"rgba(65,97,45,0)");
    ctx.fillStyle=patch; ctx.beginPath(); ctx.ellipse(640,626,58,39,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  drawMotionMatchedFullFrame(ctx, first, second, mix = 0, { zoom = 1, panX = 0, panY = 0, motionX = 0, label = "MATCH CAM", mirror = false } = {}) {
    const blend = smoothstep(clamp(mix, 0, 1));
    const hasSecond = Boolean(second && second !== first);
    const transition = hasSecond ? Math.sin(blend * Math.PI) : 0;
    const dominant = blend < 0.5 ? first : second;
    const secondary = blend < 0.5 ? second : first;
    const secondaryAlpha = transition * 0.22;
    const secondaryDirection = blend < 0.5 ? 1 : -1;

    ctx.save();
    ctx.translate(640 + panX, 360 + panY);
    ctx.scale(mirror ? -zoom : zoom, zoom);
    ctx.translate(-640, -360);
    ctx.globalAlpha = 1;
    ctx.drawImage(dominant, 0, 0, 1280, 720);
    if (hasSecond && secondaryAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = secondaryAlpha;
      ctx.translate(motionX * transition * secondaryDirection, -transition * 1.5);
      ctx.drawImage(secondary, 0, 0, 1280, 720);
      ctx.restore();
    }
    ctx.restore();
    this.drawFrameGradeAndLabel(ctx, 1, label);
  }

  drawBlendedFullFrame(ctx, first, second, mix = 0, { zoom = 1, panX = 0, panY = 0, label = "MATCH CAM", mirror = false } = {}) {
    const blend = smoothstep(clamp(mix, 0, 1));
    ctx.save();
    ctx.translate(640 + panX, 360 + panY);
    ctx.scale(mirror ? -zoom : zoom, zoom);
    ctx.translate(-640, -360);
    const hasSecond = Boolean(second && second !== first);
    ctx.globalAlpha = hasSecond ? 1 - blend : 1;
    ctx.drawImage(first, 0, 0, 1280, 720);
    if (hasSecond && blend > 0.001) {
      ctx.globalAlpha = blend;
      ctx.drawImage(second, 0, 0, 1280, 720);
    }
    ctx.restore();
    this.drawFrameGradeAndLabel(ctx, 1, label);
  }

  drawFrameGradeAndLabel(ctx, opacity, label) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const grade = ctx.createLinearGradient(0, 0, 0, 720);
    grade.addColorStop(0, "rgba(5,8,18,.22)");
    grade.addColorStop(0.62, "rgba(3,8,18,.02)");
    grade.addColorStop(1, "rgba(2,6,15,.48)");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = "rgba(4,8,18,.84)";
    roundRect(ctx, 28, 642, 226, 48, 14);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.96)";
    ctx.font = "900 17px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, 48, 673);
    ctx.restore();
  }

  drawFullFrame(ctx, image, opacity, { zoom = 1, panX = 0, panY = 0, label = "MATCH CAM", mirror = false } = {}) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(640 + panX, 360 + panY);
    ctx.scale(mirror ? -zoom : zoom, zoom);
    ctx.translate(-640, -360);
    ctx.drawImage(image, 0, 0, 1280, 720);
    ctx.restore();

    this.drawFrameGradeAndLabel(ctx, opacity, label);
  }
  drawInset(ctx, image, opacity, outcome, time) {
    const width = 440;
    const height = 248;
    const x = 810;
    const y = 402;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, x - 7, y - 7, width + 14, height + 14, 20);
    ctx.fillStyle = "rgba(4,8,18,.92)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.save();
    roundRect(ctx, x, y, width, height, 16);
    ctx.clip();
    const bob = Math.sin(time * 0.004) * 2;
    ctx.drawImage(image, x - 3, y - 3 + bob, width + 6, height + 6);
    const shade = ctx.createLinearGradient(x, y, x, y + height);
    shade.addColorStop(0, "rgba(0,0,0,.02)");
    shade.addColorStop(1, "rgba(0,0,0,.42)");
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
    ctx.strokeStyle = outcome === "save" ? "rgba(87,211,170,.96)" : "rgba(255,255,255,.82)";
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(3,8,18,.82)";
    roundRect(ctx, x + 14, y + 14, 170, 35, 11);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "900 14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("KEEPER REACTION", x + 29, y + 37);
    ctx.restore();
  }

  drawOutcomeCut(ctx, image, opacity, outcome, time) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const zoom = 1.025 + Math.sin(time * 0.003) * 0.004;
    ctx.translate(640, 360);
    ctx.scale(zoom, zoom);
    ctx.translate(-640, -360);
    ctx.drawImage(image, 0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.min(1, opacity * 1.55);
    const colour = outcome === "goal" ? "#68e38f" : outcome === "save" ? "#59b7ff" : "#ff6f70";
    ctx.strokeStyle = colour;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 1264, 704);
    ctx.fillStyle = "rgba(4,8,18,.82)";
    roundRect(ctx, 36, 36, 238, 56, 16);
    ctx.fill();
    ctx.fillStyle = colour;
    ctx.font = "1000 27px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(outcome === "goal" ? "NET CAM" : outcome === "save" ? "GLOVE CAM" : "MISS CAM", 58, 73);
    ctx.restore();
  }

  drawContactFlash(ctx, progress) {
    const pulse = Math.exp(-Math.pow((progress - REPLAY_TIMELINE.strike) / 0.020, 2));
    if (pulse < 0.02) return;
    ctx.save();
    ctx.globalAlpha = pulse * 0.16;
    const flash = ctx.createRadialGradient(840, 535, 3, 840, 535, 48);
    flash.addColorStop(0, "rgba(255,255,250,.82)");
    flash.addColorStop(0.45, "rgba(236,229,199,.28)");
    flash.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = flash;
    ctx.fillRect(785, 480, 110, 110);
    ctx.restore();
  }
}

function zoneLabel(zoneId) {
  return String(zoneId || "bottom-centre").replaceAll("-", " ");
}

function visualLabel(index) {
  return ["SET", "RUN-UP", "PLANT", "BOOT CONTACT", "FOLLOW-THROUGH"][index] || "MATCH CAM";
}

function fadeWindow(value, start, fadeInEnd, fadeOutStart, end) {
  if (value <= start || value >= end) return 0;
  if (value < fadeInEnd) return smoothstep((value - start) / Math.max(0.0001, fadeInEnd - start));
  if (value <= fadeOutStart) return 1;
  return 1 - smoothstep((value - fadeOutStart) / Math.max(0.0001, end - fadeOutStart));
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
