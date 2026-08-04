import { ZONES, getZone } from "./shootout-core.mjs";
import {
  REPLAY_TIMELINE,
  ballRenderScale,
  sampleBallTrail,
  sampleBallWorld,
  sampleKeeperMotion
} from "./shootout-physics-0.9h5a.mjs";

import {
  GOAL,
  BALL_RADIUS,
  SCENE_LAYOUT,
  PITCH_MARKINGS,
  createCamera,
  VolumetricGoalNet,
  frameSegments,
  goalTargetWorld,
  goalPocketWorld,
  projectGoalZone
} from "./shootout-net.mjs?v=0.9.29";

import {
  PENALTY_CAMERA_PHASES,
  impactEnvelope,
  kickContactEnvelope,
  mapCameraPoint,
  penaltyCameraFrame
} from "./shootout-cinematics.mjs?v=0.9.29";

import {
  PenaltyVisualPack,
  BROADCAST_SELECTION_POINTS,
  penaltyActionImpactPointForViewer
} from "./penalty-visuals-0.9h5a.mjs";
import {
  PENALTY_VIEWERS,
  canonicalPenaltyZone,
  createPenaltyReplaySnapshot,
  normalizePenaltyViewer,
  perspectiveAriaLabel,
  perspectiveLabel
} from "./penalty-perspective.mjs?v=0.9.29";

const BALL_START = SCENE_LAYOUT.ballStart;
const STRIKER_BASE = SCENE_LAYOUT.strikerBase;
const KEEPER_BASE = SCENE_LAYOUT.keeperBase;

export class ShootoutScene {
  constructor(canvas, caption, { overlay = null, reducedMotion = false, onEvent = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.caption = caption;
    this.camera = createCamera();
    this.net = new VolumetricGoalNet({ camera: this.camera, quality: "high" });
    this.preview = null;
    this.role = "striker";
    this.moveActive = true;
    this.replay = null;
    this.resultStill = null;
    this.particles = [];
    this.lastTime = performance.now();
    this.crowdOffset = 0;
    this.reducedMotion = Boolean(reducedMotion);
    this.snapshotMode = new URLSearchParams(location.search).has("snapshot");
    this.showTargetGuide = new URLSearchParams(location.search).has("targets");
    this.overlay = overlay;
    this.onEvent = typeof onEvent === "function" ? onEvent : null;
    this.visualPack = new PenaltyVisualPack();
    this.viewerRole = PENALTY_VIEWERS.STRIKER;
    this.updatePerspectiveAccessibility(this.viewerRole);
    this.layoutZoneButtons();
    window.addEventListener("resize", () => this.layoutZoneButtons());
    if (this.snapshotMode) this.draw(0);
    else requestAnimationFrame(time => this.loop(time));
  }

  layoutZoneButtons() {
    for (const zone of ZONES) {
      const button = this.overlay?.querySelector(`[data-zone="${zone.id}"]`);
      if (!button) continue;
      const point = BROADCAST_SELECTION_POINTS.zones[zone.id];
      if (!point) continue;
      button.style.left = `${point.x / 12.8}%`;
      button.style.top = `${point.y / 7.2}%`;
    }
  }

  updatePerspectiveAccessibility(viewerRole = PENALTY_VIEWERS.STRIKER) {
    const role = normalizePenaltyViewer(viewerRole);
    this.viewerRole = role;
    this.canvas?.setAttribute?.("aria-label", "Penalty replay from the fixed main-camera angle");
    this.canvas?.setAttribute?.("data-viewer-role", role);
  }

  setReducedMotion(value) {
    this.reducedMotion = value;
  }

  emit(type, detail = {}) {
    try { this.onEvent?.({ type, ...detail }); } catch {}
  }

  toggleTargetGuide() {
    this.showTargetGuide = !this.showTargetGuide;
    return this.showTargetGuide;
  }

  setIdle({ role = "striker", active = true, preview = null, caption = null } = {}) {
    this.role = role;
    this.moveActive = active;
    this.preview = preview;
    if (!this.replay && this.net.energy() < 0.00008) this.net.reset();
    if (caption) this.setCaption(caption);
  }

  setCaption(text, kind = "") {
    this.caption.textContent = text;
    this.caption.className = `scene-caption${kind ? ` ${kind}` : ""}`;
  }

  playReplay(round, { viewerRole = PENALTY_VIEWERS.STRIKER } = {}) {
    const role = normalizePenaltyViewer(viewerRole || round?.viewerRole);
    this.preview = null;
    this.resultStill = null;
    this.net.reset();
    this.particles.length = 0;
    this.updatePerspectiveAccessibility(role);
    return new Promise(resolve => {
      this.replay = {
        ...createPenaltyReplaySnapshot(round, role),
        start: performance.now(),
        duration: this.reducedMotion ? 1400 : 4050,
        readyCalled: false,
        anticipated: false,
        keeperLaunched: false,
        settled: false,
        cameraEntered: true,
        ballCameraEntered: true,
        impactCameraEntered: true,
        impacted: false,
        kicked: false,
        resultAnnounced: false,
        resolved: false,
        resolve
      };
      this.setCaption("Main camera set. Watch the kick and dive together.");
      this.emit("replay-start", { round: this.replay, outcome: this.replay.outcome, viewerRole: role });
    });
  }

  setResultStill(round, { viewerRole = PENALTY_VIEWERS.STRIKER } = {}) {
    const role = normalizePenaltyViewer(viewerRole || round?.viewerRole);
    this.updatePerspectiveAccessibility(role);
    this.resultStill = round ? createPenaltyReplaySnapshot(round, role) : null;
  }

  testNet(zoneId = "top-right") {
    const zone = getZone(zoneId || "top-right");
    this.net.reset();
    this.net.impactZone(zone, 1.35);
    this.spawnParticles(zone, "goal");
    this.setCaption(`Net test: ${zone.label}.`, "goal");
  }

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 1 / 30);
    this.lastTime = time;
    this.crowdOffset += dt * 0.75;
    this.net.update(dt);
    this.updateReplay(time);
    this.updateParticles(dt);
    this.draw(time);
    requestAnimationFrame(next => this.loop(next));
  }

  updateReplay(time) {
    if (!this.replay) return;
    const elapsed = time - this.replay.start;
    const progress = clamp(elapsed / this.replay.duration, 0, 1);
    this.replay.progress = progress;

    if (progress > REPLAY_TIMELINE.readyCue && !this.replay.readyCalled) {
      this.replay.readyCalled = true;
      this.emit("ready", { outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > REPLAY_TIMELINE.anticipationStart && !this.replay.anticipated) {
      this.replay.anticipated = true;
      this.emit("anticipation", { outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > PENALTY_CAMERA_PHASES.runupEnd && !this.replay.cameraEntered) {
      this.replay.cameraEntered = true;
      this.emit("camera-cut", { camera: "main-camera", outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > PENALTY_CAMERA_PHASES.shoulderEnd && !this.replay.ballCameraEntered) {
      this.replay.ballCameraEntered = true;
      this.emit("camera-cut", { camera: "main-camera", outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > PENALTY_CAMERA_PHASES.ballCamEnd && !this.replay.impactCameraEntered) {
      this.replay.impactCameraEntered = true;
      this.emit("camera-cut", { camera: "main-camera", outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > REPLAY_TIMELINE.strike && !this.replay.kicked) {
      this.spawnKickParticles();
      this.replay.kicked = true;
      this.emit("strike", { outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > REPLAY_TIMELINE.keeperTakeoff && !this.replay.keeperLaunched) {
      this.replay.keeperLaunched = true;
      this.emit("keeper-takeoff", {
        outcome: this.replay.outcome,
        zone: canonicalPenaltyZone(this.replay, "keeperZone"),
        round: this.replay,
        viewerRole: this.replay.viewerRole
      });
    }

    if (this.replay.outcome === "goal" && progress > REPLAY_TIMELINE.goalPlane && !this.replay.impacted) {
      const target = getZone(canonicalPenaltyZone(this.replay, "shotZone"));
      const current = sampleBallWorld(this.replay, progress).position;
      const previous = sampleBallWorld(this.replay, Math.max(0, progress - 0.012)).position;
      const velocity = {
        x: current.x - previous.x,
        y: current.y - previous.y,
        z: current.z - previous.z
      };
      this.net.impactZone(target, this.replay.shotActive ? 1.72 : 0.48, { velocity });
      this.spawnParticles(target, "goal");
      this.replay.impacted = true;
      this.setCaption(this.replay.caption, "goal");
      this.emit("impact", { outcome: "goal", zone: target.id, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (this.replay.outcome === "save" && progress > REPLAY_TIMELINE.keeperContact && !this.replay.impacted) {
      const target = getZone(canonicalPenaltyZone(this.replay, "shotZone"));
      this.spawnParticles(target, "save");
      this.replay.impacted = true;
      this.setCaption(this.replay.caption, "save");
      this.emit("impact", { outcome: "save", zone: target.id, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (this.replay.outcome === "miss" && progress > REPLAY_TIMELINE.goalPlane && !this.replay.impacted) {
      const target = getZone(canonicalPenaltyZone(this.replay, "shotZone"));
      this.spawnParticles(target, "miss");
      this.replay.impacted = true;
      this.setCaption(this.replay.caption, "miss");
      this.emit("impact", { outcome: "miss", zone: target.id, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > REPLAY_TIMELINE.resultReveal && !this.replay.resultAnnounced) {
      this.replay.resultAnnounced = true;
      this.spawnCelebration(this.replay.outcome);
      this.emit("result", { outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
    }

    if (progress > REPLAY_TIMELINE.settleStart && !this.replay.settled) {
      this.replay.settled = true;
      this.emit("settle", {
        outcome: this.replay.outcome,
        zone: canonicalPenaltyZone(this.replay, "shotZone"),
        round: this.replay,
        viewerRole: this.replay.viewerRole
      });
    }

    if (progress >= 1 && !this.replay.resolved) {
      const resolve = this.replay.resolve;
      this.replay.resolved = true;
      this.emit("replay-end", { outcome: this.replay.outcome, round: this.replay, viewerRole: this.replay.viewerRole });
      setTimeout(() => {
        this.resultStill = createPenaltyReplaySnapshot(this.replay, this.replay.viewerRole || this.viewerRole);
        this.replay = null;
        resolve();
      }, this.reducedMotion ? 20 : 520);
    }
  }

  spawnParticles(zone, kind) {
    const target = this.replay
      ? (BROADCAST_SELECTION_POINTS.zones[zone.id] || BROADCAST_SELECTION_POINTS.zones["bottom-centre"])
      : projectGoalZone(this.camera, zone);
    const count = this.reducedMotion ? 4 : 22;
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x: target.x,
        y: target.y,
        vx: (Math.random() - 0.5) * (kind === "goal" ? 270 : 180),
        vy: -50 - Math.random() * 190,
        life: 0.55 + Math.random() * 0.65,
        age: 0,
        size: 3 + Math.random() * 7,
        kind
      });
    }
  }

  spawnKickParticles() {
    const point = BROADCAST_SELECTION_POINTS.ball;
    const count = this.reducedMotion ? 3 : 14;
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x: point.x + (Math.random() - 0.5) * 18,
        y: point.y + 8,
        vx: -45 + Math.random() * 100,
        vy: -25 - Math.random() * 80,
        life: 0.32 + Math.random() * 0.38,
        age: 0,
        size: 2 + Math.random() * 5,
        kind: "turf"
      });
    }
  }

  spawnCelebration(outcome) {
    // 0.9H5A keeps the television frame clean. Crowd and result audio carry the
    // reaction; coloured confetti no longer floats over the football action.
    void outcome;
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.age += dt;
      particle.vy += (particle.gravity ?? 255) * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    this.particles = this.particles.filter(particle => particle.age < particle.life);
  }

  draw(time) {
    const ctx = this.ctx;
    const replay = this.replay;
    ctx.clearRect(0, 0, 1280, 720);

    // 0.9G: Penalty Shootout has one photographic renderer from selection
    // through the stored result. The legacy cartoon drawing methods remain in
    // this module only for backwards-compatible utilities; normal play never
    // calls them.
    if (!replay && this.resultStill) {
      if (!this.visualPack.drawResultStill(ctx, this.resultStill, time, this.resultStill.viewerRole || this.viewerRole)) {
        this.visualPack.drawLoadingFrame(ctx);
      }
      this.drawVignette(ctx);
      return;
    }

    if (!replay) {
      this.visualPack.drawSelection(ctx, {
        role: this.role,
        preview: this.preview,
        active: this.moveActive,
        time
      });
      this.drawVignette(ctx);
      return;
    }

    if (!this.visualPack.drawCinematic(ctx, replay, time, this.reducedMotion, replay.viewerRole || this.viewerRole)) {
      this.visualPack.drawLoadingFrame(ctx);
    }
    this.drawParticles(ctx);
    this.drawCinematicOverlay(ctx, replay, time);
    this.drawVignette(ctx);
  }

  idleBall() {
    const point = this.camera.project(BALL_START);
    return { x: point.x, y: point.y, scale: 1.02, rotation: 0, visible: true };
  }

  idleKeeper() {
    const point = this.camera.project(KEEPER_BASE);
    return { x: point.x, y: point.y - SCENE_LAYOUT.keeperFootOffset * SCENE_LAYOUT.keeperScale, lean: 0, stretch: 0, scale: SCENE_LAYOUT.keeperScale };
  }

  drawBackground(ctx, time) {
    const sky = ctx.createLinearGradient(0, 0, 0, 470);
    sky.addColorStop(0, "#197cc6");
    sky.addColorStop(0.48, "#65b9e8");
    sky.addColorStop(0.80, "#bde2f4");
    sky.addColorStop(1, "#ecf6fb");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 720);

    const sunGlow = ctx.createRadialGradient(1010, 74, 10, 1010, 74, 230);
    sunGlow.addColorStop(0, "rgba(255,247,197,.72)");
    sunGlow.addColorStop(0.35, "rgba(255,242,180,.22)");
    sunGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(760, 0, 520, 360);

    this.drawCloud(ctx, 170, 95, 1.2, time * 0.0015);
    this.drawCloud(ctx, 780, 70, 0.9, time * 0.001);
    this.drawCloud(ctx, 1080, 145, 1.35, time * 0.0007);

    ctx.fillStyle = "#788c82";
    ctx.beginPath();
    ctx.moveTo(0, 300);
    for (let x = 0; x <= 1280; x += 80) {
      ctx.lineTo(x, 258 + Math.sin(x * 0.014) * 28 + Math.sin(x * 0.004) * 35);
    }
    ctx.lineTo(1280, 430);
    ctx.lineTo(0, 430);
    ctx.closePath();
    ctx.fill();

    this.drawStadium(ctx, time);
    this.drawFence(ctx);

    const turf = ctx.createLinearGradient(0, 330, 0, 720);
    turf.addColorStop(0, "#3aa45a");
    turf.addColorStop(0.48, "#148347");
    turf.addColorStop(1, "#075d34");
    ctx.fillStyle = turf;
    ctx.fillRect(0, 330, 1280, 390);
    this.drawMowingBands(ctx);
    this.drawPitchMarkings(ctx);
    this.drawGrassDetail(ctx);
  }

  drawStadium(ctx, time) {
    ctx.save();
    const stand = ctx.createLinearGradient(0, 215, 0, 355);
    stand.addColorStop(0, "#293b60");
    stand.addColorStop(0.62, "#182744");
    stand.addColorStop(1, "#101a32");
    ctx.fillStyle = stand;
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(1280, 178);
    ctx.lineTo(1280, 343);
    ctx.lineTo(0, 410);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(235,242,255,.18)";
    for (let tier = 0; tier < 3; tier += 1) {
      const yLeft = 278 + tier * 38;
      const yRight = 208 + tier * 32;
      ctx.beginPath();
      ctx.moveTo(0, yLeft);
      ctx.lineTo(1280, yRight);
      ctx.lineTo(1280, yRight + 8);
      ctx.lineTo(0, yLeft + 8);
      ctx.closePath();
      ctx.fill();
    }

    const crowdColors = ["#f6cf4e", "#eaeff8", "#5cd0bd", "#8c79f2", "#ef7b6d"];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 58; col += 1) {
        const x = col * 23 + (row % 2) * 11 - 10;
        const y = 270 + row * 17 - x * 0.056;
        const flicker = 0.62 + Math.sin(time * 0.002 + col * 1.7 + row) * 0.10;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = crowdColors[(col * 3 + row * 5) % crowdColors.length];
        ctx.beginPath();
        ctx.arc(x, y, 2.4 + ((col + row) % 3) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#121d35";
    ctx.beginPath();
    ctx.moveTo(0, 226);
    ctx.lineTo(1280, 154);
    ctx.lineTo(1280, 180);
    ctx.lineTo(0, 254);
    ctx.closePath();
    ctx.fill();

    this.drawFloodlight(ctx, 88, 105, 0.95);
    this.drawFloodlight(ctx, 1170, 62, 0.82);
    ctx.restore();
  }

  drawFloodlight(ctx, x, y, scaleValue) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleValue, scaleValue);
    ctx.strokeStyle = "rgba(20,32,52,.92)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(8, 230);
    ctx.lineTo(0, 35);
    ctx.stroke();
    ctx.fillStyle = "#243452";
    roundRect(ctx, -42, 0, 92, 48, 8);
    ctx.fill();
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const lampX = -28 + col * 20;
        const lampY = 12 + row * 20;
        const glow = ctx.createRadialGradient(lampX, lampY, 1, lampX, lampY, 13);
        glow.addColorStop(0, "rgba(255,252,221,.98)");
        glow.addColorStop(0.34, "rgba(255,240,160,.86)");
        glow.addColorStop(1, "rgba(255,239,170,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lampX, lampY, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawGrassDetail(ctx) {
    ctx.save();
    ctx.lineCap = "round";
    for (let index = 0; index < 170; index += 1) {
      const x = (index * 83) % 1280;
      const y = 420 + ((index * 47) % 285);
      const length = 2 + (index % 5) * 0.7;
      ctx.globalAlpha = 0.12 + (index % 4) * 0.025;
      ctx.strokeStyle = index % 3 ? "#d8f0c7" : "#063f29";
      ctx.lineWidth = 0.8 + (index % 2) * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(index * 2.1) * 1.7, y - length);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMowingBands(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.075;
    for (let x = -18, index = 0; x < 18; x += 3, index += 1) {
      const corners = [
        this.camera.project({ x, y: 0.004, z: 0 }),
        this.camera.project({ x: x + 3, y: 0.004, z: 0 }),
        this.camera.project({ x: x + 3, y: 0.004, z: -16 }),
        this.camera.project({ x, y: 0.004, z: -16 })
      ];
      ctx.fillStyle = index % 2 ? "#d6f5d8" : "#034f2d";
      ctx.beginPath();
      corners.forEach((point, cornerIndex) => cornerIndex ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawPitchMarkings(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(250,252,247,.76)";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(14,70,42,.2)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    for (const marking of PITCH_MARKINGS) {
      const start = this.camera.project(marking.start);
      const end = this.camera.project(marking.end);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCloud(ctx, x, y, scaleValue, drift) {
    ctx.save();
    ctx.translate(x + Math.sin(drift) * 9, y);
    ctx.scale(scaleValue, scaleValue);
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.beginPath();
    ctx.arc(0, 15, 26, 0, Math.PI * 2);
    ctx.arc(33, 0, 34, 0, Math.PI * 2);
    ctx.arc(72, 14, 28, 0, Math.PI * 2);
    ctx.roundRect(-22, 12, 120, 36, 18);
    ctx.fill();
    ctx.restore();
  }

  drawFence(ctx) {
    const horizon = 318;
    ctx.save();
    ctx.strokeStyle = "rgba(23,37,51,.74)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(1280, 198);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let x = -30; x < 1350; x += 105) {
      const topY = horizon - x * 0.094;
      ctx.beginPath();
      ctx.moveTo(x, 430);
      ctx.lineTo(x, topY);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(22,38,51,.25)";
    ctx.lineWidth = 1;
    for (let offset = -320; offset < 1320; offset += 22) {
      ctx.beginPath();
      ctx.moveTo(offset, 430);
      ctx.lineTo(offset + 460, 210);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offset, 210);
      ctx.lineTo(offset + 460, 430);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGoalShadow(ctx) {
    const points = [
      this.camera.project({ x: GOAL.width / 2, y: 0, z: 0 }),
      this.camera.project({ x: -GOAL.width / 2, y: 0, z: 0 }),
      this.camera.project({ x: -GOAL.width / 2 + 1.3, y: 0, z: GOAL.depth + 1.35 }),
      this.camera.project({ x: GOAL.width / 2 + 1.3, y: 0, z: GOAL.depth + 1.35 })
    ];
    ctx.save();
    ctx.fillStyle = "rgba(7,38,26,.24)";
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawNetShadow(ctx) {
    const panels = [this.net.panel("back"), this.net.panel("near-side")];
    ctx.save();
    ctx.strokeStyle = "rgba(10,45,28,.16)";
    ctx.lineWidth = 1.1;
    for (const panel of panels) {
      if (!panel) continue;
      const index = (col, row) => row * panel.cols + col;
      for (let row = 0; row < panel.rows; row += 2) {
        ctx.beginPath();
        for (let col = 0; col < panel.cols; col += 1) {
          const node = panel.nodes[index(col, row)];
          const shadow = this.camera.project({
            x: node.position.x + node.position.y * 0.6,
            y: 0.012,
            z: node.position.z + node.position.y * 0.48
          });
          if (col) ctx.lineTo(shadow.x, shadow.y);
          else ctx.moveTo(shadow.x, shadow.y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawGoalVolume(ctx) {
    const project = world => this.camera.project(world);
    const farTop = project({ x: GOAL.width / 2, y: GOAL.height, z: GOAL.depth });
    const nearTop = project({ x: -GOAL.width / 2, y: GOAL.height, z: GOAL.depth });
    const farBottom = project({ x: GOAL.width / 2, y: 0, z: GOAL.depth });
    const nearBottom = project({ x: -GOAL.width / 2, y: 0, z: GOAL.depth });
    const frontFarTop = project({ x: GOAL.width / 2, y: GOAL.height, z: 0 });
    const frontNearTop = project({ x: -GOAL.width / 2, y: GOAL.height, z: 0 });
    const frontNearBottom = project({ x: -GOAL.width / 2, y: 0, z: 0 });

    ctx.save();
    const rearShade = ctx.createLinearGradient(farTop.x, farTop.y, nearBottom.x, nearBottom.y);
    rearShade.addColorStop(0, "rgba(17,34,56,.17)");
    rearShade.addColorStop(1, "rgba(4,18,32,.31)");
    ctx.fillStyle = rearShade;
    ctx.beginPath();
    ctx.moveTo(farTop.x, farTop.y);
    ctx.lineTo(nearTop.x, nearTop.y);
    ctx.lineTo(nearBottom.x, nearBottom.y);
    ctx.lineTo(farBottom.x, farBottom.y);
    ctx.closePath();
    ctx.fill();

    const roofShade = ctx.createLinearGradient(frontFarTop.x, frontFarTop.y, nearTop.x, nearTop.y);
    roofShade.addColorStop(0, "rgba(225,243,252,.05)");
    roofShade.addColorStop(1, "rgba(15,33,54,.18)");
    ctx.fillStyle = roofShade;
    ctx.beginPath();
    ctx.moveTo(frontFarTop.x, frontFarTop.y);
    ctx.lineTo(frontNearTop.x, frontNearTop.y);
    ctx.lineTo(nearTop.x, nearTop.y);
    ctx.lineTo(farTop.x, farTop.y);
    ctx.closePath();
    ctx.fill();

    const sideShade = ctx.createLinearGradient(frontNearTop.x, frontNearTop.y, nearBottom.x, nearBottom.y);
    sideShade.addColorStop(0, "rgba(227,245,252,.08)");
    sideShade.addColorStop(1, "rgba(3,18,31,.24)");
    ctx.fillStyle = sideShade;
    ctx.beginPath();
    ctx.moveTo(frontNearTop.x, frontNearTop.y);
    ctx.lineTo(nearTop.x, nearTop.y);
    ctx.lineTo(nearBottom.x, nearBottom.y);
    ctx.lineTo(frontNearBottom.x, frontNearBottom.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawRearFrame(ctx) {
    const segments = frameSegments(GOAL, this.net.frameKick).rear;
    for (const [start, end] of segments) this.drawTube(ctx, start, end, false);
  }

  drawFrontFrame(ctx) {
    const segments = frameSegments(GOAL, this.net.frameKick).front;
    for (const [start, end] of segments) this.drawTube(ctx, start, end, true);
  }

  drawTube(ctx, startWorld, endWorld, primary) {
    const start = this.camera.project(startWorld);
    const end = this.camera.project(endWorld);
    const width = clamp(((start.scale + end.scale) / 2) * (primary ? 0.105 : 0.065), primary ? 9 : 5, primary ? 21 : 12);
    ctx.save();
    ctx.lineCap = "round";

    ctx.shadowColor = "rgba(3,18,25,.38)";
    ctx.shadowBlur = primary ? 14 : 8;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 9;
    ctx.strokeStyle = primary ? "#7f9099" : "rgba(145,160,167,.92)";
    ctx.lineWidth = width + (primary ? 6 : 4);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.shadowColor = "transparent";
    const body = ctx.createLinearGradient(start.x - width, start.y - width, start.x + width, start.y + width);
    body.addColorStop(0, primary ? "#ffffff" : "#edf3f5");
    body.addColorStop(0.34, primary ? "#e9eff1" : "#cbd7db");
    body.addColorStop(0.72, primary ? "#aebdc4" : "#9eafb6");
    body.addColorStop(1, primary ? "#f8fbfc" : "#e2e9eb");
    ctx.strokeStyle = body;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.globalAlpha = primary ? 0.82 : 0.52;
    ctx.strokeStyle = "rgba(255,255,255,.96)";
    ctx.lineWidth = Math.max(1.3, width * 0.20);
    ctx.beginPath();
    ctx.moveTo(start.x - 1.5, start.y - 2.5);
    ctx.lineTo(end.x - 1.5, end.y - 2.5);
    ctx.stroke();
    ctx.restore();
  }

  drawTrajectory(ctx, zone, active) {
    const previewReplay = {
      kickIndex: 0,
      shotZone: zone.id,
      keeperZone: "bottom-centre",
      outcome: "goal",
      reason: "preview",
      shotActive: active,
      keeperActive: true
    };
    ctx.save();
    ctx.strokeStyle = active ? "rgba(247,201,59,.94)" : "rgba(239,103,103,.88)";
    ctx.lineWidth = 5;
    ctx.setLineDash([13, 11]);
    ctx.beginPath();
    for (let index = 0; index <= 34; index += 1) {
      const t = index / 34;
      const progress = lerp(REPLAY_TIMELINE.strike, REPLAY_TIMELINE.goalPlane, t);
      const point = sampleBallWorld(previewReplay, progress).position;
      const projected = this.camera.project(point);
      if (index) ctx.lineTo(projected.x, projected.y);
      else ctx.moveTo(projected.x, projected.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const end = this.camera.project(goalTargetWorld(zone));
    ctx.beginPath();
    ctx.arc(end.x, end.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  replayFrame(replay) {
    const sample = sampleBallWorld(replay, replay.progress || 0);
    const ballPoint = this.camera.project(sample.position);
    const trail = sampleBallTrail(replay, replay.progress || 0, this.reducedMotion ? 2 : 6)
      .filter(item => item.speed > 4 && ["flight", "deflection", "miss-flight"].includes(item.phase))
      .map(item => {
        const projected = this.camera.project(item.position);
        return {
          x: projected.x,
          y: projected.y,
          scale: ballRenderScale(this.camera, item.position),
          speed: item.speed
        };
      });
    const keeper = sampleKeeperMotion(replay, replay.progress || 0, this.camera);

    return {
      ball: {
        x: ballPoint.x,
        y: ballPoint.y,
        world: sample.position,
        scale: ballRenderScale(this.camera, sample.position),
        rotation: sample.spin,
        speed: sample.speed,
        phase: sample.phase,
        visible: sample.visible,
        compression: kickContactEnvelope(replay.progress || 0),
        trail
      },
      keeper
    };
  }

  drawBallShadow(ctx, ball) {
    if (!ball.world || ball.world.z > GOAL.depth + 0.5) return;
    const ground = this.camera.project({ x: ball.world.x, y: 0.018, z: ball.world.z });
    const height = Math.max(0, ball.world.y - BALL_START.y);
    const fade = clamp(1 - height / 3.2, 0.12, 0.72);
    const radius = 25 * ball.scale * (1 + height * 0.09);
    ctx.save();
    ctx.globalAlpha = fade;
    const gradient = ctx.createRadialGradient(ground.x, ground.y, 1, ground.x, ground.y, radius);
    gradient.addColorStop(0, "rgba(5,34,22,.46)");
    gradient.addColorStop(1, "rgba(5,34,22,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, radius * 1.42, radius * 0.42, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBallTrail(ctx, trail) {
    if (this.reducedMotion || !trail.length) return;
    trail.forEach((point, index) => {
      const alpha = (index + 1) / trail.length * 0.13;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, 17 * point.scale, 10 * point.scale, -0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawCharacterShadow(ctx, x, y, width, alpha = 0.30, rotation = 0) {
    ctx.save();
    const shadow = ctx.createRadialGradient(x, y, 2, x, y, width);
    shadow.addColorStop(0, `rgba(2,33,20,${alpha})`);
    shadow.addColorStop(1, "rgba(2,33,20,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y, width, width * 0.25, rotation, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLimb(ctx, start, end, width, light, dark) {
    const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, light);
    gradient.addColorStop(0.62, dark);
    gradient.addColorStop(1, light);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = Math.max(2, width * 0.14);
    ctx.beginPath();
    ctx.moveTo(start.x - width * 0.12, start.y - width * 0.10);
    ctx.lineTo(end.x - width * 0.12, end.y - width * 0.10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawGlove(ctx, x, y, angle, front = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const glove = ctx.createLinearGradient(-18, -12, 22, 18);
    glove.addColorStop(0, "#ffffff");
    glove.addColorStop(0.52, front ? "#e8f0f5" : "#cddae2");
    glove.addColorStop(1, "#9baeb9");
    ctx.fillStyle = glove;
    ctx.strokeStyle = "#25354b";
    ctx.lineWidth = 3;
    roundRect(ctx, -18, -13, 35, 27, 10);
    ctx.fill();
    ctx.stroke();
    for (let finger = 0; finger < 3; finger += 1) {
      ctx.beginPath();
      ctx.moveTo(-5 + finger * 7, -10);
      ctx.lineTo(-4 + finger * 7, -20 - finger * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = front ? "#48c7b7" : "#32998f";
    ctx.beginPath();
    ctx.arc(-8, 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBoot(ctx, x, y, angle, color = "#f8fbff", sole = "#101b31") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const boot = ctx.createLinearGradient(-18, -8, 25, 12);
    boot.addColorStop(0, "#ffffff");
    boot.addColorStop(0.45, color);
    boot.addColorStop(1, "#aab8c4");
    ctx.fillStyle = boot;
    ctx.strokeStyle = sole;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-19, -8);
    ctx.lineTo(11, -8);
    ctx.quadraticCurveTo(27, -6, 29, 7);
    ctx.lineTo(23, 13);
    ctx.lineTo(-19, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sole;
    ctx.fillRect(-17, 10, 40, 4);
    ctx.restore();
  }

  drawHead(ctx, x, y, skin = "#c87957", facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    const neck = ctx.createLinearGradient(-9, 8, 12, 24);
    neck.addColorStop(0, skin);
    neck.addColorStop(1, "#9e563e");
    ctx.fillStyle = neck;
    roundRect(ctx, -10, 8, 20, 22, 7);
    ctx.fill();

    const face = ctx.createRadialGradient(-8 * facing, -10, 3, 2, 1, 34);
    face.addColorStop(0, "#efb088");
    face.addColorStop(0.58, skin);
    face.addColorStop(1, "#8f4c39");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(0, -7, 28, 31, -0.07 * facing, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d2237";
    ctx.beginPath();
    ctx.arc(-3 * facing, -18, 27, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-25 * facing, -15);
    ctx.quadraticCurveTo(-7 * facing, -31, 22 * facing, -22);
    ctx.lineTo(17 * facing, -13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#172033";
    ctx.beginPath();
    ctx.arc(8 * facing, -7, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,42,34,.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(13 * facing, 4);
    ctx.quadraticCurveTo(5 * facing, 8, -2 * facing, 5);
    ctx.stroke();
    ctx.restore();
  }

  drawKeeper(ctx, keeper, replay) {
    const keeperScale = keeper.scale || SCENE_LAYOUT.keeperScale;
    const shadowX = keeper.shadowX ?? keeper.x + 8;
    const shadowY = keeper.shadowY ?? keeper.y + 137 * keeperScale;
    const landingSpread = 1 + (keeper.landing || 0) * 0.22;
    this.drawCharacterShadow(
      ctx,
      shadowX,
      shadowY + 4,
      58 * keeperScale * landingSpread,
      keeper.airborne ? 0.18 : 0.34,
      keeper.lean * 0.10
    );

    ctx.save();
    ctx.translate(keeper.x, keeper.y);
    ctx.scale(keeperScale * (1 + (keeper.squash || 0)), keeperScale * (1 - (keeper.squash || 0)));
    ctx.rotate(keeper.lean);
    const stretch = keeper.stretch || 0;
    const direction = keeper.direction || 1;
    let leftHand = { x: -72 - stretch * 62, y: -31 - stretch * 29 };
    let rightHand = { x: 72 + stretch * 62, y: -31 - stretch * 29 };
    const saveCelebration = replay?.outcome === "save"
      ? easeOutCubic(clamp(((replay.progress || 0) - REPLAY_TIMELINE.resultReveal) / 0.24, 0, 1))
      : 0;
    if (saveCelebration > 0) {
      const lift = 78 * saveCelebration;
      if (direction > 0) rightHand = { x: 78, y: -42 - lift };
      else leftHand = { x: -78, y: -42 - lift };
    }
    const backHand = direction > 0 ? leftHand : rightHand;
    const frontHand = direction > 0 ? rightHand : leftHand;
    const backShoulder = direction > 0 ? { x: -13, y: 7 } : { x: 13, y: 7 };
    const frontShoulder = direction > 0 ? { x: 13, y: 7 } : { x: -13, y: 7 };
    const backKnee = direction > 0 ? { x: -27 - stretch * 17, y: 96 } : { x: 27 + stretch * 17, y: 96 };
    const frontKnee = direction > 0 ? { x: 27 + stretch * 17, y: 96 } : { x: -27 - stretch * 17, y: 96 };
    const backFoot = direction > 0 ? { x: -39 - stretch * 25, y: 141 } : { x: 39 + stretch * 25, y: 141 };
    const frontFoot = direction > 0 ? { x: 39 + stretch * 25, y: 141 } : { x: -39 - stretch * 25, y: 141 };

    ctx.shadowColor = "rgba(7,17,40,.28)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;

    // Rear limbs establish depth before the torso.
    this.drawLimb(ctx, backShoulder, { x: backHand.x * 0.72, y: backHand.y * 0.72 }, 24, "#d9ae1e", "#92720f");
    this.drawLimb(ctx, { x: backHand.x * 0.72, y: backHand.y * 0.72 }, backHand, 18, "#f4d44f", "#c59b1c");
    this.drawGlove(ctx, backHand.x, backHand.y, direction > 0 ? -0.45 : 0.45, false);
    this.drawLimb(ctx, { x: direction > 0 ? -17 : 17, y: 76 }, backKnee, 23, "#1c3159", "#0e1b36");
    this.drawLimb(ctx, backKnee, backFoot, 18, "#1b2a4c", "#09142c");
    this.drawBoot(ctx, backFoot.x, backFoot.y, direction > 0 ? 0.13 : Math.PI - 0.13, "#dbe5ec");

    const torso = ctx.createLinearGradient(-42, -10, 42, 82);
    torso.addColorStop(0, "#ffe36a");
    torso.addColorStop(0.46, "#f3c52d");
    torso.addColorStop(1, "#a5790e");
    ctx.fillStyle = torso;
    ctx.strokeStyle = "#8a6511";
    ctx.lineWidth = 3.5;
    roundRect(ctx, -38, -13, 76, 91, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.24)";
    roundRect(ctx, -29, -6, 16, 72, 8);
    ctx.fill();
    ctx.fillStyle = "#17315c";
    roundRect(ctx, -35, 58, 70, 34, 8);
    ctx.fill();
    ctx.fillStyle = "#f6f8ff";
    ctx.font = "900 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("1", 0, 39);
    ctx.fillStyle = "#3f53a4";
    ctx.beginPath();
    ctx.arc(20, 4, 7, 0, Math.PI * 2);
    ctx.fill();

    this.drawHead(ctx, 0, -36, "#c87957", direction);

    // Front limbs overlap the torso and sell the 2.5D dive.
    this.drawLimb(ctx, frontShoulder, { x: frontHand.x * 0.72, y: frontHand.y * 0.72 }, 26, "#ffe15c", "#b78712");
    this.drawLimb(ctx, { x: frontHand.x * 0.72, y: frontHand.y * 0.72 }, frontHand, 19, "#f8d74c", "#c19316");
    this.drawGlove(ctx, frontHand.x, frontHand.y, direction > 0 ? -0.35 : 0.35, true);
    this.drawLimb(ctx, { x: direction > 0 ? 17 : -17, y: 76 }, frontKnee, 25, "#244376", "#101f42");
    this.drawLimb(ctx, frontKnee, frontFoot, 20, "#1e365f", "#08152e");
    this.drawBoot(ctx, frontFoot.x, frontFoot.y, direction > 0 ? 0.08 : Math.PI - 0.08, "#ffffff");

    if (replay && !replay.keeperActive && replay.progress > 0.2) {
      ctx.fillStyle = "rgba(255,255,255,.96)";
      ctx.font = "900 24px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("LATE!", 55, -78);
    }
    ctx.restore();
  }

  drawStriker(ctx, replay) {
    const p = replay?.progress || 0;
    const approach = replay
      ? easeInOutCubic(clamp((p - REPLAY_TIMELINE.anticipationStart) / (REPLAY_TIMELINE.strike - REPLAY_TIMELINE.anticipationStart), 0, 1))
      : 0;
    const recovery = replay ? easeOutCubic(clamp((p - REPLAY_TIMELINE.strike) / 0.30, 0, 1)) : 0;
    const reaction = replay ? easeOutCubic(clamp((p - REPLAY_TIMELINE.resultReveal) / 0.24, 0, 1)) : 0;
    const celebrating = replay?.outcome === "goal" ? reaction : 0;
    const disappointed = replay && replay.outcome !== "goal" ? reaction : 0;
    const kick = approach * (1 - recovery * 0.28);
    const base = this.camera.project(STRIKER_BASE);
    const ball = this.camera.project(BALL_START);
    const anchorX = lerp(base.x, ball.x - 48, approach * 0.84);
    const celebrationJump = celebrating * Math.sin(clamp((p - REPLAY_TIMELINE.resultReveal) / 0.22, 0, 1) * Math.PI) * 18;
    const anchorY = base.y - SCENE_LAYOUT.strikerLift + approach * 8 - Math.sin(approach * Math.PI) * 5 - celebrationJump;
    const strikerScale = SCENE_LAYOUT.strikerScale;
    const bodyLean = -0.05 - kick * 0.13 + recovery * 0.08 - celebrating * 0.05 + disappointed * 0.06;

    this.drawCharacterShadow(
      ctx,
      anchorX + 5,
      anchorY + 94 * strikerScale,
      54 * strikerScale,
      0.34 - Math.sin(approach * Math.PI) * 0.07,
      -0.08
    );

    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.scale(strikerScale, strikerScale);
    ctx.rotate(bodyLean);
    ctx.shadowColor = "rgba(8,22,54,.28)";
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 9;

    const supportHip = { x: -10, y: 42 };
    const supportKnee = { x: -31 + kick * 4, y: 79 };
    const supportFoot = { x: -29 + kick * 5, y: 99 };
    const kickHip = { x: 12, y: 42 };
    const kickKnee = { x: 39 + kick * 25, y: 68 - kick * 30 };
    const kickFoot = { x: 66 + kick * 38, y: 88 - kick * 48 };

    const rearHand = celebrating
      ? { x: -58, y: -82 }
      : disappointed
        ? { x: -25, y: -75 }
        : { x: -58 - kick * 8, y: 12 - kick * 11 };
    const frontHand = celebrating
      ? { x: 62, y: -88 }
      : disappointed
        ? { x: 27, y: -76 }
        : { x: 56 + kick * 7, y: 6 - kick * 17 };

    // Rear arm and support leg.
    this.drawLimb(ctx, { x: -23, y: -14 }, rearHand, 17, "#e7a479", "#a85e43");
    this.drawLimb(ctx, supportHip, supportKnee, 23, "#5c47df", "#302292");
    this.drawLimb(ctx, supportKnee, supportFoot, 18, "#202e55", "#0b1732");
    this.drawBoot(ctx, supportFoot.x, supportFoot.y, -0.04, "#f7fbff");

    const torso = ctx.createLinearGradient(-38, -38, 40, 49);
    torso.addColorStop(0, "#8c79f4");
    torso.addColorStop(0.50, "#6249e8");
    torso.addColorStop(1, "#33229e");
    ctx.fillStyle = torso;
    ctx.strokeStyle = "#30208e";
    ctx.lineWidth = 3.5;
    roundRect(ctx, -34, -39, 69, 88, 19);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.20)";
    roundRect(ctx, -25, -31, 15, 63, 7);
    ctx.fill();
    ctx.fillStyle = "#f3c431";
    ctx.fillRect(-33, 17, 67, 12);
    ctx.fillStyle = "#17234a";
    roundRect(ctx, -31, 39, 63, 31, 7);
    ctx.fill();
    ctx.fillStyle = "#f8f9ff";
    ctx.font = "900 23px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("9", 0, 5);

    this.drawHead(ctx, 0, -68, "#d88b61", 1);

    // Front arm and kicking leg. Late poses distinguish celebration from disappointment.
    this.drawLimb(ctx, { x: 24, y: -14 }, frontHand, 18, "#efb083", "#b96b4c");
    this.drawLimb(ctx, kickHip, kickKnee, 25, "#725af0", "#39269f");
    this.drawLimb(ctx, kickKnee, kickFoot, 19, "#253863", "#0b1834");
    this.drawBoot(ctx, kickFoot.x, kickFoot.y, -0.04 - kick * 0.22, "#ffffff");

    // Jersey side seam and shoulder cap add form without full 3D assets.
    ctx.strokeStyle = "rgba(255,255,255,.38)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, -28);
    ctx.quadraticCurveTo(35, -6, 28, 35);
    ctx.stroke();
    ctx.restore();
  }

  drawBall(ctx, ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);
    const speedStretch = clamp((ball.speed || 0) / 36, 0, 0.11);
    const compression = ball.compression || 0;
    ctx.scale(
      ball.scale * (1 + speedStretch + compression * 0.10),
      ball.scale * (0.96 - speedStretch * 0.42 - compression * 0.13)
    );
    ctx.shadowColor = "rgba(5,14,32,.42)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    const shell = ctx.createRadialGradient(-10, -12, 2, 3, 4, 31);
    shell.addColorStop(0, "#ffffff");
    shell.addColorStop(0.40, "#f7fafb");
    shell.addColorStop(0.74, "#d9e1e5");
    shell.addColorStop(1, "#8c9ba5");
    ctx.fillStyle = shell;
    ctx.strokeStyle = "#152033";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#172032";
    polygon(ctx, 0, 0, 9, 5, -Math.PI / 2);
    ctx.fill();

    const satellitePanels = [
      { x: -15, y: -10, rotation: -0.45, scale: 0.62 },
      { x: 15, y: -8, rotation: 0.45, scale: 0.58 },
      { x: -8, y: 16, rotation: 0.8, scale: 0.54 },
      { x: 13, y: 14, rotation: -0.8, scale: 0.48 }
    ];
    for (const panel of satellitePanels) {
      ctx.save();
      ctx.translate(panel.x, panel.y);
      ctx.rotate(panel.rotation);
      ctx.scale(panel.scale, panel.scale);
      ctx.fillStyle = "#263144";
      polygon(ctx, 0, 0, 8, 5, -Math.PI / 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(27,38,54,.88)";
    ctx.lineWidth = 2.8;
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
      ctx.quadraticCurveTo(
        Math.cos(angle + 0.15) * 17,
        Math.sin(angle + 0.15) * 17,
        Math.cos(angle) * 23,
        Math.sin(angle) * 23
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 0.72;
    const shine = ctx.createRadialGradient(-10, -12, 1, -10, -12, 10);
    shine.addColorStop(0, "rgba(255,255,255,.98)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(-9, -11, 8, 5, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-1, -1, 21, Math.PI * 1.08, Math.PI * 1.66);
    ctx.stroke();
    ctx.restore();
  }

  drawContactDetail(ctx, replay, ball, keeper, impactPoint) {
    const p = replay.progress || 0;
    const keeperView = replay.viewerRole === PENALTY_VIEWERS.KEEPER;
    // The keeper replay has its own photographic ball/glove/net treatment.
    // Suppress the legacy comic contact bursts in any fallback render path.
    const kickFlash = keeperView ? 0 : kickContactEnvelope(p);
    const impactFlash = keeperView ? 0 : impactEnvelope(p, replay.outcome);

    if (kickFlash > 0.02) {
      const ballPoint = this.camera.project(BALL_START);
      ctx.save();
      ctx.globalAlpha = kickFlash;
      const glow = ctx.createRadialGradient(ballPoint.x, ballPoint.y, 2, ballPoint.x, ballPoint.y, 58);
      glow.addColorStop(0, "rgba(255,255,255,.98)");
      glow.addColorStop(0.18, "rgba(247,201,59,.94)");
      glow.addColorStop(1, "rgba(247,201,59,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ballPoint.x, ballPoint.y, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.92)";
      ctx.lineWidth = 5;
      for (let index = 0; index < 7; index += 1) {
        const angle = -1.25 + index * 0.20;
        ctx.beginPath();
        ctx.moveTo(ballPoint.x - 8, ballPoint.y + 5);
        ctx.lineTo(ballPoint.x - 48 - Math.cos(angle) * 38, ballPoint.y + Math.sin(angle) * 30);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (impactFlash <= 0.015) return;
    const contact = replay.outcome === "save" ? { x: ball.x, y: ball.y } : impactPoint;
    ctx.save();
    ctx.globalAlpha = impactFlash;
    const color = replay.outcome === "goal"
      ? "247,201,59"
      : replay.outcome === "save"
        ? "216,236,255"
        : "255,154,133";
    const glow = ctx.createRadialGradient(contact.x, contact.y, 3, contact.x, contact.y, replay.outcome === "save" ? 78 : 62);
    glow.addColorStop(0, "rgba(255,255,255,.98)");
    glow.addColorStop(0.25, `rgba(${color},.82)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(contact.x, contact.y, replay.outcome === "save" ? 78 : 62, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${color},.94)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(contact.x, contact.y, 34 + (1 - impactFlash) * 45, 0, Math.PI * 2);
    ctx.stroke();

    if (replay.outcome === "save") {
      ctx.strokeStyle = "rgba(255,255,255,.94)";
      ctx.lineWidth = 7;
      const direction = keeper.direction || 1;
      for (let index = 0; index < 4; index += 1) {
        ctx.beginPath();
        ctx.moveTo(contact.x - direction * (10 + index * 6), contact.y + index * 3);
        ctx.lineTo(contact.x - direction * (65 + index * 13), contact.y + (index - 1.5) * 18);
        ctx.stroke();
      }
    } else if (replay.outcome === "miss") {
      ctx.strokeStyle = "rgba(255,255,255,.82)";
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(contact.x, contact.y, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  drawOverShoulderView(ctx, replay, cameraFrame, ball, impactPoint, time) {
    const opacity = cameraFrame.shoulderOpacity || 0;
    if (opacity <= 0.01) return;
    const p = replay.progress || 0;
    const trackedBall = mapCameraPoint({ x: ball.x, y: ball.y }, cameraFrame);
    const windupStart = REPLAY_TIMELINE.anticipationStart + 0.055;
    const strikeT = clamp((p - windupStart) / (REPLAY_TIMELINE.strike - windupStart + 0.0001), 0, 1);
    const follow = easeOutCubic(clamp((p - REPLAY_TIMELINE.strike) / 0.12, 0, 1));
    const contact = kickContactEnvelope(p);
    const launch = easeOutCubic(clamp((p - REPLAY_TIMELINE.strike) / 0.095, 0, 1));
    const ballScreen = {
      x: lerp(770, trackedBall.x, launch),
      y: lerp(585, trackedBall.y, launch)
    };

    ctx.save();
    ctx.globalAlpha = opacity;

    const foregroundShade = ctx.createLinearGradient(0, 250, 430, 720);
    foregroundShade.addColorStop(0, "rgba(8,14,30,.15)");
    foregroundShade.addColorStop(1, "rgba(5,10,24,.72)");
    ctx.fillStyle = foregroundShade;
    ctx.beginPath();
    ctx.moveTo(0, 284);
    ctx.quadraticCurveTo(116, 230, 218, 315);
    ctx.lineTo(365, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();

    // Back-of-head and shoulder silhouette create a readable player POV.
    ctx.fillStyle = "#1a2032";
    ctx.beginPath();
    ctx.ellipse(108, 252, 53, 63, -0.12, 0, Math.PI * 2);
    ctx.fill();
    const skin = ctx.createRadialGradient(124, 267, 3, 112, 277, 45);
    skin.addColorStop(0, "#e2a27b");
    skin.addColorStop(0.68, "#b86e50");
    skin.addColorStop(1, "#74402f");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(126, 274, 35, 43, -0.10, 0, Math.PI * 2);
    ctx.fill();

    const jersey = ctx.createLinearGradient(66, 315, 305, 690);
    jersey.addColorStop(0, "#8a79f3");
    jersey.addColorStop(0.42, "#5d44db");
    jersey.addColorStop(1, "#241878");
    ctx.fillStyle = jersey;
    ctx.strokeStyle = "rgba(19,15,67,.88)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(52, 330);
    ctx.quadraticCurveTo(134, 283, 236, 337);
    ctx.quadraticCurveTo(300, 424, 292, 565);
    ctx.lineTo(110, 596);
    ctx.quadraticCurveTo(56, 475, 52, 330);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,.34)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(92, 330);
    ctx.quadraticCurveTo(165, 360, 198, 505);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "1000 54px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("9", 158, 437);

    // The kick camera owns a large, explicit ball. The previous 0.9E view
    // relied on the transformed wide-shot ball, which could be outside the lens.
    this.drawBall(ctx, {
      ...ball,
      x: ballScreen.x,
      y: ballScreen.y,
      visible: true,
      scale: Math.max(1.32, (ball.scale || 1) * 1.36),
      compression: contact
    });

    const hip = { x: 232, y: 548 };
    const knee = {
      x: lerp(258, ballScreen.x - 108, easeInOutCubic(strikeT)),
      y: lerp(660, ballScreen.y - 92, easeInOutCubic(strikeT)) - follow * 28
    };
    const foot = {
      x: lerp(288, ballScreen.x - 8, easeOutCubic(strikeT)) + follow * 112,
      y: lerp(705, ballScreen.y + 2, easeOutCubic(strikeT)) - follow * 31
    };
    this.drawLimb(ctx, hip, knee, 62, "#725bee", "#2e208e");
    this.drawLimb(ctx, knee, foot, 48, "#1f315a", "#08152f");
    this.drawBoot(ctx, foot.x, foot.y, -0.15 - strikeT * 0.42 + follow * 0.18, "#f7fbff", "#0c1427");

    if (contact > 0.02) {
      ctx.globalAlpha = contact;
      ctx.strokeStyle = "rgba(255,255,255,.96)";
      ctx.lineWidth = 7;
      for (let index = 0; index < 5; index += 1) {
        const offset = (index - 2) * 13;
        ctx.beginPath();
        ctx.moveTo(ballScreen.x - 12, ballScreen.y + offset * 0.18);
        ctx.lineTo(ballScreen.x - 90 - index * 8, ballScreen.y + offset);
        ctx.stroke();
      }
    }

    // A subtle shoulder camera bob prevents the POV from feeling like a still overlay.
    ctx.globalAlpha = opacity * 0.18;
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(640, 360, 246 + Math.sin(time * 0.004) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawCameraPresentation(ctx, replay, cameraFrame, ball, impactPoint, time) {
    const p = replay.progress || 0;
    const letterbox = Math.max(0, cameraFrame.letterbox || 0);
    if (letterbox > 0) {
      const bar = 78 * letterbox;
      ctx.save();
      ctx.fillStyle = "rgba(4,8,20,.92)";
      ctx.fillRect(0, 0, 1280, bar);
      ctx.fillRect(0, 720 - bar, 1280, bar);
      ctx.restore();
    }

    if (replay.viewerRole !== PENALTY_VIEWERS.KEEPER && cameraFrame.ballCamOpacity > 0.02 && ball.visible) {
      const ballScreen = mapCameraPoint({ x: ball.x, y: ball.y }, cameraFrame);
      ctx.save();
      ctx.globalAlpha = cameraFrame.ballCamOpacity * 0.30;
      ctx.strokeStyle = "rgba(255,255,255,.78)";
      ctx.lineWidth = 3;
      for (let index = 0; index < 14; index += 1) {
        const angle = index * Math.PI * 2 / 14 + time * 0.00015;
        const inner = 48 + (index % 3) * 12;
        const outer = 145 + (index % 4) * 24;
        ctx.beginPath();
        ctx.moveTo(ballScreen.x + Math.cos(angle) * inner, ballScreen.y + Math.sin(angle) * inner);
        ctx.lineTo(ballScreen.x + Math.cos(angle) * outer, ballScreen.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    const flash = cameraFrame.impactOpacity || 0;
    if (replay.viewerRole !== PENALTY_VIEWERS.KEEPER && flash > 0.03) {
      ctx.save();
      ctx.globalAlpha = flash * 0.18;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(7,13,31,.72)";
    roundRect(ctx, 28, 28, 222, 46, 15);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.font = "900 17px system-ui";
    ctx.textAlign = "left";
    const phaseLabel = cameraFrame.phase === "over-shoulder"
      ? "BEHIND THE BALL"
      : cameraFrame.phase === "ball-cam"
        ? "BALL CAM"
        : cameraFrame.phase === "save-cam"
          ? "GLOVE CAM"
          : cameraFrame.phase === "net-cam"
            ? "GOAL CAM"
            : cameraFrame.phase === "miss-cam"
              ? "MISS CAM"
              : "MATCH CAMERA";
    ctx.fillText(phaseLabel, 48, 58);

    if (p > REPLAY_TIMELINE.strike && p < REPLAY_TIMELINE.resultReveal) {
      const speed = Math.round((ball.speed || 0) * 3.6);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(247,201,59,.96)";
      ctx.font = "1000 20px system-ui";
      ctx.fillText(`${Math.max(0, speed)} km/h`, 1248, 58);
    }
    ctx.restore();
  }

  drawTargetGuide(ctx) {
    ctx.save();
    ctx.font = "800 17px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (const zone of ZONES) {
      const contact = this.camera.project(goalTargetWorld(zone));
      const pocket = this.camera.project(goalPocketWorld(zone));

      ctx.strokeStyle = "rgba(45, 211, 193, .9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(contact.x, contact.y);
      ctx.lineTo(pocket.x, pocket.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(247, 201, 59, .96)";
      ctx.beginPath();
      ctx.arc(contact.x, contact.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#172032";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "rgba(45, 211, 193, .94)";
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(23, 32, 50, .92)";
      ctx.fillText(zone.label, contact.x, contact.y - 14);
    }
    ctx.restore();
  }

  drawCinematicOverlay(ctx, replay, time) {
    const p = replay.progress || 0;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(5,10,24,.72)";
    roundRect(ctx, 28, 28, 252, 42, 14);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.font = "900 15px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("PENALTY REPLAY · MAIN CAMERA", 46, 50);
    ctx.restore();
    ctx.textAlign = "center";

    if (p >= REPLAY_TIMELINE.readyCue && p < REPLAY_TIMELINE.strike) {
      const local = clamp((p - REPLAY_TIMELINE.readyCue) / (REPLAY_TIMELINE.strike - REPLAY_TIMELINE.readyCue), 0, 1);
      const label = local < 0.56 ? "READY" : "SHOOT";
      const pulse = 1 + Math.sin(local * Math.PI) * 0.10;
      ctx.translate(640, 154);
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = Math.min(1, local * 4, (1 - local) * 4);
      ctx.font = "1000 56px system-ui";
      ctx.lineWidth = 12;
      ctx.strokeStyle = "rgba(13,18,48,.70)";
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = label === "SHOOT" ? "#f7c93b" : "#ffffff";
      ctx.fillText(label, 0, 0);
    }

    if (p >= REPLAY_TIMELINE.resultReveal) {
      const local = clamp((p - REPLAY_TIMELINE.resultReveal) / 0.15, 0, 1);
      const settle = 1 - Math.pow(1 - local, 3);
      const outcomeLabel = replay.outcome === "goal" ? "GOAL!" : replay.outcome === "save" ? "SAVED!" : "MISSED!";
      const fill = replay.outcome === "goal" ? "#f7c93b" : replay.outcome === "save" ? "#d9ecff" : "#ffad9d";
      ctx.translate(640, 285 - (1 - settle) * 35);
      ctx.rotate(Math.sin(time * 0.0025) * 0.012 * (1 - settle));
      ctx.scale(0.78 + settle * 0.28, 0.78 + settle * 0.28);
      ctx.globalAlpha = Math.min(1, local * 5);
      ctx.font = "1000 94px system-ui";
      ctx.lineWidth = 18;
      ctx.strokeStyle = "rgba(12,17,42,.82)";
      ctx.strokeText(outcomeLabel, 0, 0);
      ctx.fillStyle = fill;
      ctx.fillText(outcomeLabel, 0, 0);
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    const celebrationPalette = ["#f7c93b", "#25c9b8", "#7358f0", "#ff7f75", "#ffffff"];
    for (const particle of this.particles) {
      const alpha = 1 - particle.age / particle.life;
      const celebration = particle.kind?.endsWith("-celebration");
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = celebration
        ? celebrationPalette[particle.colourIndex % celebrationPalette.length]
        : particle.kind === "goal"
          ? "#f7c93b"
          : particle.kind === "save"
            ? "#d8ecff"
            : particle.kind === "turf"
              ? "#7bcf62"
              : "#ff9f8f";
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.age * (particle.spinRate ?? 7));
      if (celebration && particle.colourIndex % 2 === 0) {
        ctx.fillRect(-particle.size * 0.32, -particle.size, particle.size * 0.64, particle.size * 2);
      } else {
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }
      ctx.restore();
    }
  }

  drawVignette(ctx) {
    const vignette = ctx.createRadialGradient(660, 370, 230, 660, 370, 770);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(3,10,30,.24)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1280, 720);
  }
}

function polygon(ctx, x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function easeOutCubic(t) { return 1 - (1 - t) ** 3; }
function easeInOutCubic(t) { return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; }
