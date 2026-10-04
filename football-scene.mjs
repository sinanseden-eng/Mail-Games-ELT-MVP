import { TIMING, clamp, lerp, smooth, targetFor, replaySnapshot, keeperPose } from './football-motion.mjs';
import { NET_DEPTH, TV_BALL_START, TV_TARGETS, projectPitch, projectGoalPoint, tvKeeperPose, tvNetPoint, tvBallAt, tvStrikerPose } from './football-camera.mjs';

const W = 1280, H = 720;
const ink = '#082c32';
const line = (ctx, points, color, width = 1) => {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
};
const poly = (ctx, points, color) => { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); };
const p = (x, y) => ({ x, y });
function ellipse(ctx, x, y, rx, ry, color) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function label(ctx, text, x, y, size, color, weight = 700, align = 'left') { ctx.fillStyle = color; ctx.font = `${weight} ${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(text, x, y); }

function stadium(ctx) {
  const grass = ctx.createLinearGradient(0, 170, 0, H);
  grass.addColorStop(0, '#3e8561'); grass.addColorStop(.56, '#28795a'); grass.addColorStop(1, '#195346');
  ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
  // Mowing bands, the six-yard box and penalty area share one pitch projection.
  for (let i = -1; i < 10; i++) {
    const d = i * .32;
    poly(ctx, [projectPitch(-2.4, d), projectPitch(5.2, d), projectPitch(5.2, d + .32), projectPitch(-2.4, d + .32)], i % 2 ? '#082f2417' : '#a8c87a0d');
  }
  const white = '#d9ebc79c';
  line(ctx, [projectPitch(-2.6), projectPitch(5)], white, 2);
  for (const [halfWidth, depth] of [[1.25, .5], [2.755, 1.5]]) {
    line(ctx, [projectPitch(.5 - halfWidth), projectPitch(.5 - halfWidth, depth), projectPitch(.5 + halfWidth, depth), projectPitch(.5 + halfWidth)], white, 2.2);
  }
  const arc = [];
  // Only the part of the penalty arc outside the penalty area is marked.
  for (let i = 0; i <= 48; i++) {
    const angle = lerp(Math.asin(.5 / .832), Math.PI - Math.asin(.5 / .832), i / 48);
    arc.push(projectPitch(.5 + Math.cos(angle) * 1.25, 1 + Math.sin(angle) * .832));
  }
  line(ctx, arc, '#d9ebc76b', 2);
  const spot = projectPitch(.5, 1); ellipse(ctx, spot.x, spot.y, 4, 2.3, '#dfedc8');
  // An angled terrace sits behind the end line, like a sideline TV broadcast.
  poly(ctx, [p(0, 0), p(W, 0), p(W, 175), p(0, 393)], '#122e35');
  const roof = ctx.createLinearGradient(0, 0, 0, 280);
  roof.addColorStop(0, '#061c27'); roof.addColorStop(1, '#25464a');
  poly(ctx, [p(0, 0), p(W, 0), p(W, 35), p(0, 160)], roof);
  for (let i = 0; i < 16; i++) line(ctx, [p(i * 90 - 80, 0), p(i * 90, 160 - i * 8.8)], '#3b626633', 2);
  line(ctx, [p(0, 159), p(W, 35)], '#61817b', 2);
  ctx.save();
  poly(ctx, [p(0, 161), p(W, 37), p(W, 172), p(0, 379)], '#1b3d42');
  for (let row = 0; row < 17; row++) for (let col = 0; col < 120; col++) {
    const x = col * 11 + (row % 2) * 5, y = 174 + row * 12 - x * (.095 + row * .0038);
    const seed = Math.sin(col * 12.7 + row * 39.2) * 43758.54, f = seed - Math.floor(seed);
    const c = f > .89 ? '#d6cc91' : f > .75 ? '#bb7862' : f > .56 ? '#8baca2' : f > .30 ? '#547c78' : '#2b535b';
    ellipse(ctx, x, y, 2, 2.4, c); ctx.fillStyle = c; ctx.fillRect(x - 3, y + 2.3, 6, 4);
  }
  ctx.restore();
  for (const row of [0, 1]) {
    const y = 256 + row * 116, slope = .127 + row * .035;
    line(ctx, [p(0, y), p(W, y - slope * W)], '#0b2934', 10);
    line(ctx, [p(0, y - 5), p(W, y - slope * W - 5)], '#91a99a66', 1);
  }
  for (const [x, y] of [[119, 117], [1100, 17]]) {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 150);
    glow.addColorStop(0, '#e5f8d855'); glow.addColorStop(.2, '#bff2dd16'); glow.addColorStop(1, '#bff2dd00');
    ctx.fillStyle = glow; ctx.fillRect(x - 150, y - 130, 300, 290);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#e3f3d7'; ctx.fillRect(x - 43 + i * 17, y, 11, 5); }
  }
  // Original club branding, painted along the diagonal advertising boards.
  poly(ctx, [p(0, 364), p(W, 157), p(W, 187), p(0, 410)], '#0d2d33');
  line(ctx, [p(0, 363), p(W, 156)], '#b5caa071', 1.5);
  for (let i = 0; i < 5; i++) {
    ctx.save(); const x = i * 278 + 24; ctx.translate(x, 392 - .168 * x); ctx.rotate(-.165);
    label(ctx, 'MAIL GAMES', 0, 0, 14, '#d2dfa4', 850);
    label(ctx, 'PLAY. LEARN. REPEAT.', 116, 0, 8, '#83a69b', 600); ctx.restore();
  }
  const near = projectPitch(0), far = projectPitch(1);
  poly(ctx, [near, far, p(far.x + 62, far.y + 14), p(near.x + 84, near.y + 19)], '#082e3728');
  line(ctx, [projectPitch(0, NET_DEPTH), projectPitch(0, NET_DEPTH, 1), projectPitch(1, NET_DEPTH, 1), projectPitch(1, NET_DEPTH)], '#85a494', 3);
  for (const u of [0, 1]) line(ctx, [projectPitch(u, NET_DEPTH, 1), projectPitch(u, 0, 1)], '#a7bda8', 2.5);
}

function drawNet(ctx, round, time, sag) {
  const cols = 32, rows = 17;
  for (let i = 0; i <= cols; i++) {
    const u = i / cols;
    line(ctx, [projectPitch(u, 0, 1), projectPitch(u, NET_DEPTH / 2, 1 - .09 * sag * Math.sin(Math.PI * u)), projectPitch(u, NET_DEPTH, 1)], '#c7e0bd69', .85);
  }
  for (let j = 0; j <= 7; j++) {
    const d = NET_DEPTH * j / 7, points = [];
    for (let i = 0; i <= cols; i++) points.push(projectPitch(i / cols, d, 1 - .09 * sag * Math.sin(Math.PI * i / cols) * Math.sin(Math.PI * j / 7)));
    line(ctx, points, '#cee1c15c', .85);
  }
  for (const u of [0, 1]) {
    for (let j = 0; j <= rows; j++) line(ctx, [projectPitch(u, 0, 1 - j / rows), tvNetPoint(u, j / rows, round, time, sag)], '#d0e4c682', .9);
    for (let j = 0; j <= 10; j++) line(ctx, [projectPitch(u, NET_DEPTH * j / 10, 1), projectPitch(u, NET_DEPTH * j / 10)], '#c6e0c47c', .9);
  }
  for (let i = 0; i <= cols; i++) {
    const points = [];
    for (let j = 0; j <= rows * 2; j++) points.push(tvNetPoint(i / cols, j / (rows * 2), round, time, sag));
    line(ctx, points, '#d5e9cc9e', .95);
  }
  for (let j = 0; j <= rows; j++) {
    const points = [];
    for (let i = 0; i <= cols * 2; i++) points.push(tvNetPoint(i / (cols * 2), j / rows, round, time, sag));
    line(ctx, points, '#d1e9c791', .95);
  }
}

function drawFrame(ctx) {
  const corners = [projectPitch(0), projectPitch(0, 0, 1), projectPitch(1, 0, 1), projectPitch(1)];
  line(ctx, corners, '#123c4080', 9);
  line(ctx, corners, '#e5ebd8', 6);
  line(ctx, corners.map(v => p(v.x - 1, v.y - 1)), '#fdffed', 1.7);
  for (const u of [0, 1]) { const base = projectPitch(u); ellipse(ctx, base.x, base.y + 1, 6, 2.5, '#cfdbc4'); }
}

function segment(ctx, a, b, width, color, highlight) {
  line(ctx, [a, b], ink, width + 2.5);
  line(ctx, [a, b], color, width);
  if (highlight) line(ctx, [p(a.x - 1, a.y - 1), p(b.x - 1, b.y - 1)], highlight, width * .24);
}

function drawKeeper(ctx, pose, time, round) {
  const { hip, chest, head, sl, sr, el, er, wl, wr, kl, kr, al, ar } = pose;
  const body = keeperPose(round, time), ground = projectGoalPoint({ x: body.hip.x, y: 414 });
  const airborne = Math.max(0, 390 - body.hip.y);
  ellipse(ctx, ground.x + 10, ground.y + 3, 28 + Math.abs(chest.x - hip.x) * .4, 5, `rgba(4,31,35,${.27 - clamp(airborne / 300) * .16})`);
  const lh = p(hip.x - 4, hip.y), rh = p(hip.x + 4, hip.y + 2);
  for (const [h, k, a] of [[lh, kl, al], [rh, kr, ar]]) {
    segment(ctx, h, k, 11, '#183b48', '#375360');
    segment(ctx, k, a, 8, '#d9be55', '#fae49c');
    const bootX = a.x < hip.x ? -5 : 5;
    segment(ctx, a, p(a.x + bootX, a.y + 1), 7, '#e2edcc');
    line(ctx, [p(a.x - 5, a.y + 5), p(a.x + 8, a.y + 5)], '#0b2c34', 3);
  }
  segment(ctx, sl, el, 10, '#e7bd48', '#f7d766');
  segment(ctx, el, wl, 8, '#d6a16d', '#edbd83');
  poly(ctx, [p(sl.x - 3, sl.y - 2), p(sr.x + 3, sr.y - 2), p(hip.x + 8, hip.y + 3), p(hip.x - 8, hip.y + 1)], ink);
  poly(ctx, [p(sl.x - 3, sl.y), p(sr.x + 2, sr.y), p(hip.x + 6, hip.y), p(hip.x - 6, hip.y)], '#ebc344');
  line(ctx, [p(chest.x - 7, chest.y + 4), p(hip.x - 5, hip.y - 8)], '#ffe791', 4);
  segment(ctx, sr, er, 10, '#e7bd48', '#f7d766');
  segment(ctx, er, wr, 8, '#d6a16d', '#edbd83');
  segment(ctx, chest, head, 8, '#c98f5e');
  ctx.save(); ctx.translate(head.x, head.y);
  ctx.rotate(Math.atan2(chest.y - head.y, chest.x - head.x) - Math.PI / 2);
  ellipse(ctx, 0, 0, 8, 11, ink); ellipse(ctx, 0, 0, 6.8, 9.5, '#ddb17d');
  ctx.fillStyle = '#1e3136'; ctx.beginPath(); ctx.arc(0, -3, 7.5, Math.PI, Math.PI * 2); ctx.fill();
  line(ctx, [p(-3.4, -.5), p(-1.8, -.5)], '#173037', 1.6);
  line(ctx, [p(2.4, -.5), p(4, -.5)], '#173037', 1.6);
  line(ctx, [p(-2.5, 6), p(2, 6)], '#965f44', 1);
  ctx.restore();
  for (const hand of [wl, wr]) {
    ellipse(ctx, hand.x, hand.y, 6.5, 7, ink);
    ellipse(ctx, hand.x, hand.y - .5, 5.5, 6, '#f4f4d6');
    line(ctx, [p(hand.x - 4, hand.y + 3), p(hand.x + 3, hand.y + 3)], '#81bdb3', 2.5);
  }
}

function drawStriker(ctx, time, isPlaying) {
  const { root, after, step, lean, bounce, kick } = tvStrikerPose(time, isPlaying);
  ellipse(ctx, root.x + 9, root.y + 3, 34, 7, '#072d355b');
  ctx.save(); ctx.translate(root.x, root.y);
  const hip = p(0, -72 - bounce), chest = p(-9 - lean, -115 - bounce), head = p(-14 - lean, -140 - bounce);
  const supportKnee = p(9 + step * 11, -36), supportAnkle = p(15 + step * 19, -Math.max(0, -step) * 19);
  const kickKnee = p(-15 - after * 12, -39 - after * 13);
  const farShoulder = p(3 - lean, -114 - bounce), nearShoulder = p(-17 - lean, -114 - bounce);
  const farElbow = p(23 + after * 15, -91 + step * 8), nearElbow = p(-29 - after * 13, -91 - step * 8);
  segment(ctx, farShoulder, farElbow, 13, '#bf513f', '#e57b59');
  segment(ctx, farElbow, p(farElbow.x + 8, farElbow.y + 17), 9, '#a97657');
  segment(ctx, p(6, hip.y), supportKnee, 18, '#e4e3d4', '#fff5da');
  segment(ctx, supportKnee, supportAnkle, 12, '#d55e46', '#f09069');
  segment(ctx, supportAnkle, p(supportAnkle.x - 11, supportAnkle.y + 1), 10, '#a8e2b4');
  segment(ctx, p(-7, hip.y), kickKnee, 19, '#eee9dc', '#fff8e9');
  segment(ctx, kickKnee, kick, 12, '#e26b4e', '#f8a07a');
  segment(ctx, kick, p(kick.x - 9, kick.y), 10, '#b4e9b8');
  line(ctx, [p(kick.x - 12, kick.y + 4), p(kick.x + 2, kick.y + 4)], '#123b39', 2);
  poly(ctx, [p(nearShoulder.x - 4, nearShoulder.y - 4), p(farShoulder.x + 8, farShoulder.y - 5), p(14, hip.y + 1), p(-13, hip.y + 2)], ink);
  poly(ctx, [p(nearShoulder.x - 2, nearShoulder.y - 3), p(farShoulder.x + 6, farShoulder.y - 4), p(12, hip.y), p(-11, hip.y)], '#e96b4e');
  line(ctx, [p(-15 - lean, -116 - bounce), p(5 - lean, -114 - bounce)], '#ffe0b3', 3);
  label(ctx, '10', 0 - lean / 2, -86 - bounce, 16, '#fff1d8', 850, 'center');
  segment(ctx, nearShoulder, nearElbow, 13, '#e76a4d', '#f8946b');
  segment(ctx, nearElbow, p(nearElbow.x - 13, nearElbow.y + 12), 9, '#b98361', '#d4a07a');
  segment(ctx, chest, head, 11, '#b9815e');
  ellipse(ctx, head.x, head.y, 10, 13, ink);
  ellipse(ctx, head.x - 1, head.y + 1, 8.7, 11.5, '#c28e68');
  poly(ctx, [p(head.x - 8, head.y - 1), p(head.x - 12, head.y + 3), p(head.x - 7, head.y + 5)], '#c28e68');
  ellipse(ctx, head.x + 1, head.y - 5, 9, 7.5, '#203638');
  ellipse(ctx, head.x + 5, head.y + 1, 2.2, 3.1, '#d7a47b');
  line(ctx, [p(head.x - 8, head.y), p(head.x - 5, head.y)], '#243e39', 1.4);
  ctx.restore();
}

function drawBall(ctx, ball, time) {
  const { x, y, r = 9 } = ball;
  ctx.save(); ctx.translate(x, y); ctx.rotate(time * 9);
  ctx.scale(1 + (ball.squash || 0), 1 - (ball.squash || 0));
  const g = ctx.createRadialGradient(-r * .3, -r * .5, r * .1, 0, 0, r);
  g.addColorStop(0, '#fffff0'); g.addColorStop(.72, '#e4eadd'); g.addColorStop(1, '#9eaea0');
  ellipse(ctx, 0, 0, r + .8, r + .8, '#103e48'); ellipse(ctx, 0, 0, r, r, g);
  const pentagon = [];
  for (let i = 0; i < 5; i++) pentagon.push(p(Math.sin(i * Math.PI * .4) * r * .42, Math.cos(i * Math.PI * .4) * r * .42));
  poly(ctx, pentagon, '#17343c');
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * .4;
    line(ctx, [p(Math.sin(a) * r * .43, Math.cos(a) * r * .43), p(Math.sin(a) * r * .93, Math.cos(a) * r * .93)], '#38534e', Math.max(.6, r * .05));
    ellipse(ctx, Math.sin(a) * r * .91, Math.cos(a) * r * .91, r * .13, r * .13, '#17343c');
  }
  ctx.restore();
}

export class ShootoutScene {
  constructor(canvas, caption, { overlay = null, reducedMotion = false, onEvent = null, onProgress = null } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.caption = caption; this.overlay = overlay;
    this.reducedMotion = reducedMotion; this.onEvent = onEvent; this.onProgress = onProgress;
    this.preview = null; this.replay = null; this.resultStill = null; this.sag = 1.6; this.speed = 1; this.paused = false;
    this.snapshotMode = new URLSearchParams(globalThis.location?.search || '').has('snapshot');
    this.net = { reset: () => { this.resultStill = null; } };
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.setAttribute?.('aria-label', 'Elevated TV view of a penalty: goal on the left, striker on the right, and a responsive sagging net');
    this.canvas.closest?.('.shootout-scene')?.classList.add('football-canvas-scene');
    if (typeof document !== 'undefined') {
      this.background = document.createElement('canvas'); this.background.width = W; this.background.height = H;
      stadium(this.background.getContext('2d'));
    }
    this.layoutZoneButtons();
    this.lastTime = performance.now();
    this.draw(0);
    if (!this.snapshotMode) this.frame = requestAnimationFrame(t => this.loop(t));
  }
  layoutZoneButtons() {
    for (const button of this.overlay?.querySelectorAll('[data-zone]') || []) {
      const zone = TV_TARGETS.find(t => t.id === targetFor(button.dataset.zone).id);
      button.style.left = `${zone.x / W * 100}%`; button.style.top = `${zone.y / H * 100}%`;
    }
  }
  setCaption(text, kind = '') {
    if (!this.caption) return;
    this.caption.textContent = text || ''; this.caption.className = `scene-caption${kind ? ` ${kind}` : ''}`;
  }
  emit(type, detail = {}) { this.onEvent?.({ type, ...detail }); }
  setReducedMotion(value) { this.reducedMotion = Boolean(value); }
  setIdle({ role = 'striker', active = true, preview = null, caption = null } = {}) {
    this.role = role; this.moveActive = active; this.preview = preview;
    if (preview || (this.resultStill && caption !== this.resultStill.caption)) this.resultStill = null;
    if (caption) this.setCaption(caption);
  }
  setResultStill(round) { this.resultStill = replaySnapshot(round); }
  toggleTargetGuide() { this.showTargetGuide = !this.showTargetGuide; return this.showTargetGuide; }
  testNet(zoneId = 'top-right') { return this.playReplay({ shotZone: zoneId, keeperZone: targetFor(zoneId).x < 640 ? 'bottom-right' : 'bottom-left', outcome: 'goal', caption: 'GOAL — into the net.' }); }
  playReplay(round) {
    this.cancelReplay(); this.preview = null; this.resultStill = null; this.paused = false;
    this.lastTime = performance.now();
    const data = replaySnapshot(round);
    this.setCaption('The run-up. Pick your moment.');
    this.emit('replay-start', { outcome: data.outcome, round: data });
    return new Promise(resolve => {
      this.replay = { data, elapsed: 0, resolve, events: new Set() };
    });
  }
  cancelReplay() {
    if (this.replay) { const done = this.replay.resolve; this.replay = null; done?.({ cancelled: true }); }
  }
  togglePause() { if (!this.replay) return false; this.paused = !this.paused; this.lastTime = performance.now(); return this.paused; }
  skipReplay() { if (this.replay) { this.replay.elapsed = TIMING.end; this.updateReplay(0); } }
  seek(seconds) { if (this.replay) this.replay.elapsed = clamp(seconds, 0, TIMING.end - .001); }
  updateReplay(dt) {
    const run = this.replay;
    if (!run) return;
    if (!this.paused) run.elapsed += dt * this.speed;
    for (const [type, at] of [['ready', .1], ['anticipation', .52], ['strike', TIMING.kick], ['keeper-takeoff', TIMING.kick + .04], ['impact', run.data.outcome === 'goal' ? TIMING.net : TIMING.contact], ['result', 2.48]]) {
      if (run.elapsed >= at && !run.events.has(type)) {
        run.events.add(type); this.emit(type, { outcome: run.data.outcome, round: run.data, zone: run.data.shotZone });
        if (type === 'impact') this.setCaption(run.data.caption || this.resultLabel(run.data.outcome), run.data.outcome);
      }
    }
    this.onProgress?.(clamp(run.elapsed / TIMING.end));
    if (run.elapsed >= TIMING.end) {
      this.resultStill = run.data; this.replay = null; this.paused = false;
      run.resolve({ cancelled: false });
    }
  }
  resultLabel(outcome) { return ({ goal: 'GOAL', save: 'SAVED', parry: 'PARRIED', miss: 'OFF TARGET' })[outcome] || 'REPLAY'; }
  loop(time) {
    if (this.destroyed) return;
    // Analytic motion needs no physics substeps: use wall time so slower devices
    // do not turn a fast dive into an extended float.
    const dt = Math.max(0, (time - this.lastTime) / 1000); this.lastTime = time;
    this.updateReplay(dt);
    if (!this.paused) this.draw(time / 1000);
    this.frame = requestAnimationFrame(t => this.loop(t));
  }
  renderAt(round, seconds) { this.drawFrame(replaySnapshot(round), seconds, seconds); }
  draw(clock = 0) {
    const data = this.replay?.data || this.resultStill;
    const time = this.replay ? this.replay.elapsed : this.resultStill ? TIMING.end : 0;
    this.drawFrame(data, time, clock);
  }
  drawFrame(round, time, clock) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    if (this.background) ctx.drawImage(this.background, 0, 0); else stadium(ctx);
    const displayedTime = this.reducedMotion && round ? (time < TIMING.contact ? 0 : TIMING.end) : time;
    drawNet(ctx, round, displayedTime, this.sag);
    const ball = tvBallAt(round, displayedTime, this.sag);
    if (ball.ground) ellipse(ctx, ball.ground.x + 3, ball.ground.y + 2, 7 + clamp(ball.height) * 3, 2.5, `rgba(5, 38, 37, ${.28 - clamp(ball.height) * .16})`);
    // Goal/miss travel is behind the frame once it crosses the goal line.
    const behind = round && ['goal', 'miss'].includes(round.outcome) && displayedTime > TIMING.contact;
    if (behind) drawBall(ctx, ball, displayedTime);
    drawFrame(ctx);
    drawKeeper(ctx, tvKeeperPose(round, displayedTime), displayedTime, round);
    if (this.preview && !round) {
      const target = TV_TARGETS.find(t => t.id === targetFor(this.preview).id);
      const pulse = this.reducedMotion ? 0 : Math.sin(clock * 3) * 2;
      ctx.strokeStyle = '#e5ed9e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(target.x, target.y, 14 + pulse, 0, Math.PI * 2); ctx.stroke();
      ellipse(ctx, target.x, target.y, 3, 3, '#f2f7cb');
    }
    if (this.showTargetGuide && !round) for (const t of TV_TARGETS) ellipse(ctx, t.x, t.y, 4, 4, '#eaf5bb99');
    drawStriker(ctx, displayedTime, Boolean(round));
    if (!behind) {
      drawBall(ctx, ball, displayedTime);
    }
    // A small, finite burst at boot contact. No trails or camera shake in reduced motion.
    if (round && !this.reducedMotion && time > TIMING.kick && time < TIMING.kick + .28) {
      const k = (time - TIMING.kick) / .28;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        ellipse(ctx, TV_BALL_START.x + Math.cos(a) * k * 35, TV_BALL_START.y + Math.sin(a) * k * 10, 2 * (1 - k), 1.5, '#cfdd9c');
      }
    }
    label(ctx, 'MAIL GAMES', 32, 39, 12, '#daebd5', 800);
    label(ctx, 'TV CAMERA  /  SIDELINE', W - 32, 39, 11, '#c7d8bc', 650, 'right');
    if (round && time >= 2.48) {
      const text = this.resultLabel(round.outcome);
      ctx.save(); ctx.globalAlpha = smooth((time - 2.48) / .25);
      ctx.fillStyle = '#08282cdd'; ctx.beginPath(); ctx.roundRect(499, 92, 282, 64, 5); ctx.fill();
      label(ctx, text, 640, 134, 29, round.outcome === 'goal' ? '#d8eea0' : '#f4eee0', 850, 'center');
      ctx.restore();
    }
  }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.cancelReplay(); }
}
