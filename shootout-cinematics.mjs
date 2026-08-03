import { REPLAY_TIMELINE } from "./shootout-physics.mjs";
import { PENALTY_VIEWERS, normalizePenaltyViewer } from "./penalty-perspective.mjs";

export const PENALTY_CAMERA_PHASES = Object.freeze({
  establishEnd: 0.075,
  runupEnd: REPLAY_TIMELINE.strike - 0.035,
  shoulderEnd: REPLAY_TIMELINE.strike + 0.095,
  ballCamEnd: REPLAY_TIMELINE.goalPlane - 0.018,
  impactEnd: REPLAY_TIMELINE.resultReveal + 0.095
});

export function penaltyCameraFrame(options = {}) {
  const viewerRole = normalizePenaltyViewer(options.viewerRole);
  return viewerRole === PENALTY_VIEWERS.KEEPER
    ? keeperCameraFrame(options)
    : strikerCameraFrame(options);
}

export function strikerCameraFrame({
  progress = 0,
  outcome = "goal",
  ball = { x: 388, y: 700 },
  target = { x: 640, y: 350 },
  reducedMotion = false
} = {}) {
  const p = clamp(progress, 0, 1);
  if (reducedMotion) {
    return {
      phase: p < REPLAY_TIMELINE.resultReveal ? "broadcast" : "reaction",
      viewerRole: PENALTY_VIEWERS.STRIKER,
      scale: p < REPLAY_TIMELINE.resultReveal ? 1.02 : 1.06,
      focusX: 640,
      focusY: p < REPLAY_TIMELINE.resultReveal ? 360 : 350,
      rotation: 0,
      shoulderOpacity: 0,
      ballCamOpacity: 0,
      impactOpacity: p >= REPLAY_TIMELINE.goalPlane ? 1 : 0,
      letterbox: 0.12
    };
  }

  if (p < PENALTY_CAMERA_PHASES.establishEnd) {
    const t = smoothstep(p / PENALTY_CAMERA_PHASES.establishEnd);
    return frame("establishing", lerp(0.985, 1.025, t), lerp(640, 625, t), lerp(360, 375, t), -0.002 * t, 0, 0, 0, 0.14, PENALTY_VIEWERS.STRIKER);
  }

  if (p < PENALTY_CAMERA_PHASES.runupEnd) {
    const t = smoothstep((p - PENALTY_CAMERA_PHASES.establishEnd) / (PENALTY_CAMERA_PHASES.runupEnd - PENALTY_CAMERA_PHASES.establishEnd));
    const midpointX = lerp(560, (ball.x + target.x) * 0.5, 0.38);
    return frame("run-up", lerp(1.03, 1.16, t), lerp(625, midpointX, t), lerp(375, 472, t), lerp(-0.002, 0.006, t), t * 0.28, 0, 0, 0.22, PENALTY_VIEWERS.STRIKER);
  }

  if (p < PENALTY_CAMERA_PHASES.shoulderEnd) {
    const local = clamp((p - PENALTY_CAMERA_PHASES.runupEnd) / (PENALTY_CAMERA_PHASES.shoulderEnd - PENALTY_CAMERA_PHASES.runupEnd), 0, 1);
    const fade = Math.sin(local * Math.PI);
    const strikePulse = Math.exp(-Math.pow((p - REPLAY_TIMELINE.strike) / 0.028, 2));
    return frame(
      "over-shoulder",
      1.23 + strikePulse * 0.075,
      lerp((ball.x + target.x) * 0.5, target.x * 0.58 + ball.x * 0.42, smoothstep(local)),
      lerp(470, 440, smoothstep(local)),
      0.006 - strikePulse * 0.012,
      clamp(fade * 1.24, 0, 1),
      0,
      strikePulse,
      0.28,
      PENALTY_VIEWERS.STRIKER
    );
  }

  if (p < PENALTY_CAMERA_PHASES.ballCamEnd) {
    const local = clamp((p - PENALTY_CAMERA_PHASES.shoulderEnd) / (PENALTY_CAMERA_PHASES.ballCamEnd - PENALTY_CAMERA_PHASES.shoulderEnd), 0, 1);
    const tracking = smoothstep(local);
    return frame(
      "ball-cam",
      lerp(1.18, 1.38, tracking),
      lerp((ball.x + target.x) * 0.5, ball.x * 0.72 + target.x * 0.28, tracking),
      lerp((ball.y + target.y) * 0.5, ball.y * 0.70 + target.y * 0.30, tracking),
      Math.sin(local * Math.PI) * (target.x < 640 ? -0.006 : 0.006),
      0,
      Math.sin(local * Math.PI),
      0,
      0.30,
      PENALTY_VIEWERS.STRIKER
    );
  }

  if (p < PENALTY_CAMERA_PHASES.impactEnd) {
    const contactTime = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
    const local = clamp((p - PENALTY_CAMERA_PHASES.ballCamEnd) / (PENALTY_CAMERA_PHASES.impactEnd - PENALTY_CAMERA_PHASES.ballCamEnd), 0, 1);
    const contactPulse = Math.exp(-Math.pow((p - contactTime) / 0.035, 2));
    return frame(
      outcome === "save" ? "save-cam" : outcome === "miss" ? "miss-cam" : "net-cam",
      lerp(1.38, outcome === "save" ? 1.58 : 1.48, smoothstep(local)) + contactPulse * 0.05,
      lerp(ball.x, target.x, smoothstep(local) * 0.78),
      lerp(ball.y, target.y + (outcome === "save" ? 24 : 0), smoothstep(local) * 0.78),
      contactPulse * (target.x < 640 ? -0.012 : 0.012),
      0,
      1 - smoothstep(local),
      contactPulse,
      0.32,
      PENALTY_VIEWERS.STRIKER
    );
  }

  const local = smoothstep(clamp((p - PENALTY_CAMERA_PHASES.impactEnd) / (1 - PENALTY_CAMERA_PHASES.impactEnd), 0, 1));
  return frame("reaction", lerp(1.22, 1.06, local), lerp(target.x, 640, local), lerp(target.y + 35, 355, local), 0, 0, 0, 0, lerp(0.30, 0.18, local), PENALTY_VIEWERS.STRIKER);
}

export function keeperCameraFrame({
  progress = 0,
  target = { x: 640, y: 350 },
  keeperTarget = { x: 640, y: 350 },
  outcome = "goal",
  reducedMotion = false
} = {}) {
  const p = clamp(progress, 0, 1);
  const strike = REPLAY_TIMELINE.strike;
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  const diveT = smoothstep(clamp((p - strike + 0.015) / Math.max(0.001, contact - strike + 0.08), 0, 1));
  const settle = smoothstep(clamp((p - contact) / Math.max(0.001, 1 - contact), 0, 1));
  const direction = keeperTarget.x < 640 ? -1 : keeperTarget.x > 640 ? 1 : 0;
  const high = keeperTarget.y < 360;
  const maxRotation = reducedMotion ? 0 : 0.068;
  const rotation = direction * maxRotation * Math.sin(diveT * Math.PI * 0.72) * (1 - settle * 0.72);
  const shiftX = direction * (reducedMotion ? 8 : 54) * diveT * (1 - settle * 0.42);
  const shiftY = (high ? -1 : 1) * (reducedMotion ? 4 : 22) * diveT * (1 - settle * 0.55);

  let phase = "keeper-set";
  if (p >= strike && p < contact) phase = "incoming-ball";
  else if (p >= contact && outcome === "save") phase = "glove-contact";
  else if (p >= contact && outcome === "goal") phase = "look-back";
  else if (p >= contact) phase = "miss-reaction";

  return {
    phase,
    viewerRole: PENALTY_VIEWERS.KEEPER,
    scale: reducedMotion ? 1 : 1 + diveT * 0.025,
    focusX: 640 - shiftX,
    focusY: 360 - shiftY,
    rotation,
    translateX: shiftX,
    translateY: shiftY,
    shoulderOpacity: 0,
    // Keeper POV uses the ball itself, gloves and camera movement. The generic
    // radial ball-cam and white impact flash would make the action look comic.
    ballCamOpacity: 0,
    impactOpacity: 0,
    letterbox: reducedMotion ? 0.08 : 0.18,
    target
  };
}

export function mapCameraPoint(point, cameraFrame) {
  const dx = point.x - cameraFrame.focusX;
  const dy = point.y - cameraFrame.focusY;
  const cos = Math.cos(cameraFrame.rotation || 0);
  const sin = Math.sin(cameraFrame.rotation || 0);
  return {
    x: 640 + (dx * cos - dy * sin) * cameraFrame.scale,
    y: 360 + (dx * sin + dy * cos) * cameraFrame.scale
  };
}

export function kickContactEnvelope(progress) {
  return Math.exp(-Math.pow((clamp(progress, 0, 1) - REPLAY_TIMELINE.strike) / 0.022, 2));
}

export function impactEnvelope(progress, outcome = "goal") {
  const contact = outcome === "save" ? REPLAY_TIMELINE.keeperContact : REPLAY_TIMELINE.goalPlane;
  return Math.exp(-Math.pow((clamp(progress, 0, 1) - contact) / 0.030, 2));
}

function frame(phase, scale, focusX, focusY, rotation, shoulderOpacity, ballCamOpacity, impactOpacity, letterbox, viewerRole) {
  return { phase, scale, focusX, focusY, rotation, shoulderOpacity, ballCamOpacity, impactOpacity, letterbox, viewerRole };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function smoothstep(t) { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); }
