// Canonical animation coordinates, independent of the presentation camera.
// A replay is a pure function of the stored result and elapsed seconds.
export const FIELD = Object.freeze({ left: 318, right: 962, top: 190, bottom: 414 });
export const TIMING = Object.freeze({ kick: .92, contact: 1.58, net: 1.73, land: 2.32, end: 4.2 });
export const BALL_START = Object.freeze({ x: 650, y: 603, r: 12 });
export const TARGETS = Object.freeze(['top', 'middle', 'bottom'].flatMap((row, j) =>
  ['left', 'centre', 'right'].map((col, i) => Object.freeze({
    id: `${row}-${col}`, label: `${row[0].toUpperCase() + row.slice(1)} ${col}`,
    u: [.075, .5, .925][i], v: [.13, .52, .9][j],
    x: [366, 640, 914][i], y: [219, 306, 391][j]
  }))));
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => (t = clamp(t), t * t * (3 - 2 * t));
const phase = (t, a, b) => clamp((t - a) / (b - a));
const mixPoint = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const point = (x, y) => ({ x, y });

export function targetFor(id) {
  const key = String(id || '').toLowerCase().replaceAll('_', '-').replaceAll('center', 'centre');
  return TARGETS.find(t => t.id === key) || TARGETS[7];
}

export function replaySnapshot(round = {}) {
  return Object.freeze({
    ...round,
    shotZone: targetFor(round.canonicalShotZone || round.shotZone).id,
    keeperZone: targetFor(round.canonicalKeeperZone || round.keeperZone).id,
    outcome: ['goal', 'save', 'parry', 'miss'].includes(round.outcome) ? round.outcome : 'miss',
    shotActive: round.shotActive !== false,
    keeperActive: round.keeperActive !== false
  });
}

function readyPose(t = 0) {
  const crouch = 7 * Math.sin(Math.PI * phase(t, .62, .96));
  return {
    hip: point(640, 340 + crouch), chest: point(640, 292 + crouch), head: point(640, 267 + crouch),
    sl: point(620, 294 + crouch), sr: point(660, 294 + crouch),
    el: point(602, 321 + crouch), er: point(678, 321 + crouch),
    wl: point(592, 345 + crouch), wr: point(688, 345 + crouch),
    kl: point(616, 378), kr: point(664, 378), al: point(605, 412), ar: point(675, 412)
  };
}

function reachPose(zone) {
  const { x, y, id } = zone;
  const side = x < 600 ? -1 : x > 680 ? 1 : 0;
  if (!side) {
    const hipY = y < 270 ? y + 100 : y < 345 ? y + 48 : 365;
    const handsY = y;
    return {
      hip: point(640, hipY), chest: point(640, hipY - 40), head: point(640, hipY - 65),
      sl: point(623, hipY - 38), sr: point(657, hipY - 38),
      el: point(612, lerp(hipY - 38, handsY, .6)), er: point(668, lerp(hipY - 38, handsY, .6)),
      wl: point(633, handsY), wr: point(647, handsY),
      kl: point(620, hipY + 25), kr: point(660, hipY + 26),
      al: point(620, Math.min(412, hipY + 53)), ar: point(675, Math.min(412, hipY + 49))
    };
  }
  const low = id.startsWith('bottom');
  const dy = low ? -21 : 38;
  const p = (dx, yy) => point(x + side * dx, yy);
  return {
    hip: p(-126, y + dy), chest: p(-82, y + dy - 14), head: p(-56, y + dy - 29),
    sl: p(-88, y + dy - 26), sr: p(-77, y + dy - 3),
    el: p(-44, y - 10), er: p(-39, y + 16),
    wl: p(-3, y - 6), wr: p(-2, y + 7),
    kl: p(-163, y + dy + 9), kr: p(-151, y + dy + 34),
    al: p(-205, Math.min(412, y + dy + 29)), ar: p(-188, Math.min(415, y + dy + 51))
  };
}

function landingPose(reach, zone) {
  if (zone.x === 640) return readyPose();
  const side = zone.x < 640 ? -1 : 1;
  const x = zone.x + side * 10;
  const p = (dx, y) => point(x + side * dx, y);
  return {
    hip: p(-125, 400), chest: p(-84, 391), head: p(-54, 376),
    sl: p(-90, 380), sr: p(-76, 401), el: p(-46, 383), er: p(-42, 407),
    wl: p(-14, 386), wr: p(-13, 400),
    kl: p(-158, 408), kr: p(-155, 399), al: p(-203, 411), ar: p(-185, 387)
  };
}

export function keeperPose(round, time) {
  const ready = readyPose(time);
  const zone = targetFor(round?.keeperZone);
  const reach = reachPose(zone);
  const late = round?.keeperActive === false ? .26 : 0;
  const start = TIMING.kick + late;
  if (time <= start) return ready;
  const contact = TIMING.contact + late;
  if (time < contact) {
    const p = phase(time, start, contact);
    // Rapid leg extension, then airborne travel. Every joint changes pose.
    const travel = Math.sin(p * Math.PI / 2);
    const mix = Object.fromEntries(Object.keys(ready).map(k => [k, mixPoint(ready[k], reach[k], travel)]));
    const lift = (zone.id.startsWith('bottom') ? 7 : 23) * Math.sin(Math.PI * p);
    for (const key of Object.keys(mix)) mix[key].y -= lift;
    return mix;
  }
  const land = landingPose(reach, zone);
  const drop = phase(time, contact + .1, TIMING.land + late);
  return Object.fromEntries(Object.keys(ready).map(k => [k, mixPoint(reach[k], land[k], drop * drop)]));
}

export function netBase(u, v) {
  return { x: lerp(345, 935, u), y: lerp(173, 395, v) + 9 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) };
}

// Fixed rope attachments, local impact pocket, propagating wave and gravity sag.
// Analytic sampling makes scrubbing and emailed replays frame-rate independent.
export function netPoint(u, v, round, time, sag = 1) {
  const base = netBase(u, v);
  if (round?.outcome !== 'goal' || time < TIMING.net) return base;
  const target = targetFor(round.shotZone);
  const age = time - TIMING.net;
  const slip = smooth(phase(age, .18, 1.28));
  const centerV = lerp(target.v, .965, slip);
  const dx = (u - target.u) * 2.2;
  const dy = v - centerV;
  const d = Math.hypot(dx, dy);
  const edges = Math.min(1, Math.sin(Math.PI * u) * 5) * Math.min(1, Math.sin(Math.PI * v) * 6);
  const pocket = Math.exp(-d * d / .034) * edges;
  const onset = 1 - Math.exp(-age * 38);
  const pulse = Math.exp(-age * 2.3) * onset;
  const wave = age > d * .8 ? Math.sin((age - d * .8) * 17) * Math.exp(-(age - d * .8) * 4) * Math.exp(-d * 2.6) * edges : 0;
  const weight = Math.exp(-age * 1.8) * onset;
  return {
    x: base.x + sag * ((target.u - .5) * 46 * pulse * pocket + wave * 4),
    y: Math.min(395, base.y + sag * (60 * weight * pocket - 10 * pulse * pocket + wave * 5))
  };
}

export function ballAt(round, time, sag = 1) {
  if (!round || time <= TIMING.kick) return { ...BALL_START };
  const shot = targetFor(round.shotZone);
  const isMiss = round.outcome === 'miss';
  const target = isMiss
    ? { x: shot.x < 640 ? 259 : shot.x > 640 ? 1022 : 640, y: shot.x === 640 ? 122 : shot.y - 12 }
    : shot;
  const flight = phase(time, TIMING.kick, TIMING.contact);
  if (time <= TIMING.contact) {
    const p = 1 - Math.pow(1 - flight, 1.22);
    return { x: lerp(BALL_START.x, target.x, p), y: lerp(BALL_START.y, target.y, p) - Math.sin(p * Math.PI) * 26,
      r: lerp(12, 7.3, p) };
  }
  if (round.outcome === 'save') {
    const pose = keeperPose(round, time);
    return { x: (pose.wl.x + pose.wr.x) / 2, y: (pose.wl.y + pose.wr.y) / 2, r: 7.3 };
  }
  if (round.outcome === 'parry') {
    const p = phase(time, TIMING.contact, 2.65);
    const side = shot.x < 640 ? -1 : 1;
    return { x: shot.x + side * 210 * p, y: lerp(shot.y, 480, p) - 98 * Math.sin(Math.PI * p), r: lerp(7.3, 9.5, p) };
  }
  if (isMiss) {
    const p = phase(time, TIMING.contact, 2.55);
    return { x: lerp(target.x, target.x + (target.x - 640) * .38, p), y: lerp(target.y, 322, p) - 50 * Math.sin(Math.PI * p), r: lerp(7.3, 3.5, p) };
  }
  if (time < TIMING.net) {
    const end = netBase(shot.u, shot.v);
    return { ...mixPoint(shot, end, phase(time, TIMING.contact, TIMING.net)), r: 7.1 };
  }
  const age = time - TIMING.net;
  const slip = smooth(phase(age, .18, 1.28));
  const pos = netPoint(shot.u, lerp(shot.v, .965, slip), round, time, sag);
  // The ball presses into the same displaced mesh, then rests at its foot.
  return { ...pos, r: 7, squash: Math.sin(Math.PI * clamp(age / .18)) * .2 };
}

export function sampleReplay(round, time, { sag = 1 } = {}) {
  const snapshot = replaySnapshot(round);
  return { round: snapshot, time, ball: ballAt(snapshot, time, sag), keeper: keeperPose(snapshot, time),
    netActive: snapshot.outcome === 'goal' && time >= TIMING.net, result: time >= 2.48 };
}
