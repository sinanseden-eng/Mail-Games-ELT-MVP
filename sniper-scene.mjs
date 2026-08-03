import { sniperOutcomeLabel, sniperSpot, sniperSpotLabel } from "./sniper-core.mjs";

const WIDTH = 1280;
const HEIGHT = 720;
const BACKGROUND_SRC = "./assets/sniper-village-background.png";
const raf = globalThis.requestAnimationFrame || (callback => setTimeout(() => callback(Date.now()), 16));

const TIMELINE = Object.freeze({
  emergeStart: 0.045,
  emergeEnd: 0.185,
  aimStart: 0.17,
  aimEnd: 0.255,
  scopeAStart: 0.245,
  lockAStart: 0.325,
  shotAStart: 0.385,
  shotAImpact: 0.46,
  boltAStart: 0.505,
  reactionAEnd: 0.54,
  scopeBStart: 0.56,
  lockBStart: 0.64,
  shotBStart: 0.70,
  shotBImpact: 0.775,
  boltBStart: 0.82,
  reactionBEnd: 0.88,
  resultStart: 0.93
});

const SPOT_SCALE = Object.freeze({
  "rooftop": 0.62,
  "upper-window": 0.68,
  "broken-wall": 0.83,
  "supply-crates": 0.94
});

const SPOT_COVER_DROP = Object.freeze({
  "rooftop": 30,
  "upper-window": 38,
  "broken-wall": 47,
  "supply-crates": 58
});

export class SniperScene {
  constructor(canvas, captionElement = null, { reducedMotion = false, onEvent = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.("2d") || null;
    this.captionElement = captionElement;
    this.reducedMotion = Boolean(reducedMotion);
    this.onEvent = typeof onEvent === "function" ? onEvent : () => {};
    this.mode = "idle";
    this.idle = { actor: "A", emergence: null, target: null, active: true };
    this.replay = null;
    this.progress = 0;
    this.startedAt = 0;
    this.duration = 7600;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.pausedDuration = 0;
    this.skipRequested = false;
    this.emitted = new Set();
    this.background = null;
    this.backgroundReady = false;

    if (this.canvas) {
      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.canvas.style.display = "block";
      this.canvas.style.visibility = "visible";
      this.canvas.style.opacity = "1";
    }
    this.loadBackground();
    this.drawSafely(performanceNow());
    raf(() => this.drawSafely(performanceNow()));
  }

  loadBackground() {
    if (typeof Image === "undefined") return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      this.background = image;
      this.backgroundReady = true;
      this.drawSafely(performanceNow());
    };
    image.onerror = () => {
      this.background = null;
      this.backgroundReady = false;
    };
    image.src = BACKGROUND_SRC;
  }

  setCaption(text, tone = "") {
    if (!this.captionElement) return;
    this.captionElement.textContent = String(text || "");
    this.captionElement.className = `scene-caption sniper-caption ${tone}`.trim();
  }

  setIdle({ actor = "A", emergence = null, target = null, active = true, caption = "Answer, choose cover, then predict the rival position." } = {}) {
    this.mode = "idle";
    this.idle = { actor, emergence, target, active: Boolean(active) };
    this.replay = null;
    this.progress = 0;
    this.setCaption(caption, active ? "" : "futile");
    this.drawSafely(performanceNow());
  }

  async playReplay(replay) {
    this.mode = "replay";
    this.replay = structuredClone(replay || {});
    this.progress = 0;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.pausedDuration = 0;
    this.skipRequested = false;
    this.emitted.clear();
    this.setCaption("Positions locked. The cinematic replay is beginning…", "");
    this.emitOnce("round-start", { type: "round-start", replay: this.replay });

    if (this.reducedMotion) {
      this.progress = 1;
      this.markActionEventsComplete();
      this.emitReplayEvents(1);
      this.drawSafely(performanceNow());
      await wait(180);
      return;
    }

    this.startedAt = performanceNow();
    await new Promise(resolve => {
      const tick = now => {
        if (this.skipRequested) {
          this.progress = 1;
        } else if (!this.paused) {
          this.progress = clamp((now - this.startedAt) / this.duration, 0, 1);
        }
        this.emitReplayEvents(this.progress);
        const visualNow = this.paused
          ? this.pauseStartedAt - this.pausedDuration
          : now - this.pausedDuration;
        this.drawSafely(visualNow);
        if (this.progress < 1) raf(tick);
        else resolve();
      };
      raf(tick);
    });
  }

  togglePause() {
    if (this.mode !== "replay" || this.progress >= 1) return false;
    const now = performanceNow();
    if (!this.paused) {
      this.paused = true;
      this.pauseStartedAt = now;
    } else {
      this.paused = false;
      const pausedFor = now - this.pauseStartedAt;
      this.startedAt += pausedFor;
      this.pausedDuration += pausedFor;
      this.pauseStartedAt = 0;
    }
    this.drawSafely(now);
    return this.paused;
  }

  skipReplay() {
    if (this.mode !== "replay" || this.progress >= 1) return false;
    this.skipRequested = true;
    this.paused = false;
    this.progress = 1;
    this.markActionEventsComplete();
    this.emitReplayEvents(1);
    this.drawSafely(performanceNow() - this.pausedDuration);
    return true;
  }

  markActionEventsComplete() {
    for (const key of [
      "emerge", "aim", "scope-a", "lock-a", "shot-a", "impact-a", "bolt-a",
      "scope-b", "lock-b", "shot-b", "impact-b", "bolt-b"
    ]) this.emitted.add(key);
  }

  emitReplayEvents(progress) {
    const replay = this.replay || {};
    if (progress >= TIMELINE.emergeStart) this.emitOnce("emerge", { type: "emerge" });
    if (progress >= TIMELINE.aimStart) this.emitOnce("aim", { type: "aim" });
    if (progress >= TIMELINE.scopeAStart) {
      this.emitOnce("scope-a", { type: "scope", actor: "A" });
      this.setCaption("Player A scope view: predicted cover acquired.", "scope");
    }
    if (progress >= TIMELINE.lockAStart) {
      this.emitOnce("lock-a", { type: "scope-lock", actor: "A" });
      this.setCaption("Player A has the predicted cover centred. Breath held.", "scope");
    }
    if (progress >= TIMELINE.shotAStart) {
      this.emitOnce("shot-a", { type: replay.activeA ? "shot" : "disabled", actor: "A" });
    }
    if (progress >= TIMELINE.shotAImpact && replay.activeA) {
      this.emitOnce("impact-a", { type: "impact", actor: "A", hit: Boolean(replay.hitByA) });
    }
    if (progress >= TIMELINE.boltAStart && replay.activeA) {
      this.emitOnce("bolt-a", { type: "bolt", actor: "A" });
    }
    if (progress >= TIMELINE.scopeBStart) {
      this.emitOnce("scope-b", { type: "scope", actor: "B" });
      this.setCaption("Player B scope view: predicted cover acquired.", "scope");
    }
    if (progress >= TIMELINE.lockBStart) {
      this.emitOnce("lock-b", { type: "scope-lock", actor: "B" });
      this.setCaption("Player B has the predicted cover centred. Breath held.", "scope");
    }
    if (progress >= TIMELINE.shotBStart) {
      this.emitOnce("shot-b", { type: replay.activeB ? "shot" : "disabled", actor: "B" });
    }
    if (progress >= TIMELINE.shotBImpact && replay.activeB) {
      this.emitOnce("impact-b", { type: "impact", actor: "B", hit: Boolean(replay.hitByB) });
    }
    if (progress >= TIMELINE.boltBStart && replay.activeB) {
      this.emitOnce("bolt-b", { type: "bolt", actor: "B" });
    }
    if (progress >= TIMELINE.resultStart) {
      this.emitOnce("result", { type: "result", replay });
      this.setCaption(replay.caption || sniperOutcomeLabel(replay), replay.completed ? "finish" : (replay.hitByA || replay.hitByB ? "hit" : "miss"));
    }
  }

  emitOnce(key, event) {
    if (this.emitted.has(key)) return;
    this.emitted.add(key);
    this.onEvent(event);
  }

  drawSafely(now = performanceNow()) {
    try {
      this.draw(now);
      this.canvas?.closest?.(".sniper-scene")?.classList.add("render-ready");
      return true;
    } catch (error) {
      console.error("Sniper scene render failed", error);
      this.canvas?.closest?.(".sniper-scene")?.classList.remove("render-ready");
      return false;
    }
  }

  draw(now = performanceNow()) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const shake = this.mode === "replay" ? this.cameraShake(now) : { x: 0, y: 0 };
    const camera = this.mode === "replay" ? this.replayCamera(now) : {
      focusX: WIDTH / 2,
      focusY: HEIGHT / 2,
      zoom: 1,
      scope: null,
      reactionActor: null
    };

    ctx.save();
    ctx.translate(WIDTH / 2 + shake.x, HEIGHT / 2 + shake.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.focusX, -camera.focusY);
    this.drawBackground(ctx, now);
    this.drawLocationGuides(ctx, now);
    if (this.mode === "idle") this.drawIdle(ctx, now);
    else this.drawReplayWorld(ctx, now);
    ctx.restore();

    if (this.mode === "replay") this.drawReplayOverlay(ctx, now, camera);
    this.drawVignette(ctx);
  }

  cameraShake(now) {
    const p = this.progress;
    const kick =
      pulse(p, TIMELINE.shotAStart, TIMELINE.shotAStart + 0.055) * 5.2 +
      pulse(p, TIMELINE.shotBStart, TIMELINE.shotBStart + 0.055) * 5.2 +
      pulse(p, TIMELINE.shotAImpact, TIMELINE.shotAImpact + 0.055) * 2.4 +
      pulse(p, TIMELINE.shotBImpact, TIMELINE.shotBImpact + 0.055) * 2.4;
    return {
      x: Math.sin(now * 0.125) * kick,
      y: Math.cos(now * 0.102) * kick * 0.62
    };
  }

  replayCamera(now) {
    const p = this.progress;
    const scope = this.scopeState(p, now);
    if (scope) {
      const acquisition = easeInOut(interval(p, scope.start + 0.01, scope.lockStart));
      const hold = easeOut(interval(p, scope.lockStart, scope.shotStart));
      const recoil = recoilEnvelope(p, scope.shotStart, scope.shotStart + 0.095);
      const entryX = scope.actor === "A" ? -82 : 82;
      const entryY = scope.actor === "A" ? 44 : -38;
      const sway = lerp(6.5, 1.25, hold);
      return {
        focusX: scope.target.x + entryX * (1 - acquisition) + Math.sin(now / 410) * sway,
        focusY: scope.target.y + entryY * (1 - acquisition) + Math.cos(now / 520) * sway * 0.68 - recoil * 22,
        zoom: lerp(1, 2.25, scope.blend),
        scope: { ...scope, acquisition, hold, recoil },
        reactionActor: null
      };
    }

    const reaction = this.reactionCameraState(p);
    if (reaction) {
      return {
        focusX: reaction.target.x,
        focusY: reaction.target.y + 4,
        zoom: lerp(1, 1.48, reaction.blend),
        scope: null,
        reactionActor: reaction.actor
      };
    }

    const resultPullback = p >= TIMELINE.reactionBEnd
      ? easeInOut(interval(p, TIMELINE.reactionBEnd, TIMELINE.resultStart))
      : 0;
    return {
      focusX: WIDTH / 2,
      focusY: HEIGHT / 2,
      zoom: lerp(1.08, 1, resultPullback),
      scope: null,
      reactionActor: null
    };
  }

  scopeState(progress, now) {
    const replay = this.replay || {};
    const scopes = [
      {
        actor: "A",
        start: TIMELINE.scopeAStart,
        lockStart: TIMELINE.lockAStart,
        shotStart: TIMELINE.shotAStart,
        impact: TIMELINE.shotAImpact,
        end: TIMELINE.shotAImpact + 0.055,
        targetId: replay.targetA,
        hit: Boolean(replay.hitByA),
        active: Boolean(replay.activeA)
      },
      {
        actor: "B",
        start: TIMELINE.scopeBStart,
        lockStart: TIMELINE.lockBStart,
        shotStart: TIMELINE.shotBStart,
        impact: TIMELINE.shotBImpact,
        end: TIMELINE.shotBImpact + 0.055,
        targetId: replay.targetB,
        hit: Boolean(replay.hitByB),
        active: Boolean(replay.activeB)
      }
    ];

    for (const item of scopes) {
      if (!item.targetId || progress < item.start || progress > item.end) continue;
      const fadeIn = easeInOut(interval(progress, item.start, item.start + 0.055));
      const fadeOut = 1 - easeInOut(interval(progress, item.impact - 0.005, item.end));
      const blend = clamp(Math.min(fadeIn, fadeOut));
      const target = this.impactPoint(item.actor, item.targetId, item.active && item.hit);
      return { ...item, blend, target, now };
    }
    return null;
  }

  reactionCameraState(progress) {
    const replay = this.replay || {};
    const reactions = [
      {
        actor: "B",
        start: TIMELINE.shotAImpact + 0.015,
        end: TIMELINE.reactionAEnd,
        targetId: replay.targetA,
        hit: Boolean(replay.hitByA),
        shooter: "A"
      },
      {
        actor: "A",
        start: TIMELINE.shotBImpact + 0.015,
        end: TIMELINE.reactionBEnd,
        targetId: replay.targetB,
        hit: Boolean(replay.hitByB),
        shooter: "B"
      }
    ];
    for (const item of reactions) {
      if (!item.targetId || progress < item.start || progress > item.end) continue;
      const fadeIn = easeInOut(interval(progress, item.start, item.start + 0.025));
      const fadeOut = 1 - easeInOut(interval(progress, item.end - 0.035, item.end));
      return {
        ...item,
        blend: clamp(Math.min(fadeIn, fadeOut)),
        target: this.impactPoint(item.shooter, item.targetId, item.hit)
      };
    }
    return null;
  }

  drawBackground(ctx, now) {
    if (this.backgroundReady && this.background) {
      const image = this.background;
      const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const drift = Math.sin(now / 9000) * 5;
      ctx.drawImage(image, (WIDTH - width) / 2 + drift, (HEIGHT - height) / 2, width, height);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#d8783b");
      sky.addColorStop(0.45, "#eab766");
      sky.addColorStop(1, "#55452f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const grading = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grading.addColorStop(0, "rgba(29,25,29,.08)");
    grading.addColorStop(0.55, "rgba(45,29,22,.06)");
    grading.addColorStop(1, "rgba(12,18,20,.38)");
    ctx.fillStyle = grading;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    for (let i = 0; i < 20; i += 1) {
      const x = ((i * 83 + now / 70) % (WIDTH + 80)) - 40;
      const y = 230 + ((i * 47 + now / 35) % 410);
      ctx.globalAlpha = 0.05 + (i % 4) * 0.018;
      ctx.fillStyle = "#ffe3aa";
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLocationGuides(ctx, now) {
    const selected = this.mode === "idle" ? [this.idle.emergence, this.idle.target] : [];
    for (const id of ["rooftop", "upper-window", "broken-wall", "supply-crates"]) {
      const spot = sniperSpot(id);
      const x = spot.x * WIDTH;
      const y = spot.y * HEIGHT;
      const active = selected.includes(id);
      const pulseAmount = 0.5 + Math.sin(now / 380 + spot.number) * 0.15;
      ctx.save();
      ctx.globalAlpha = active ? 0.96 : (this.mode === "replay" ? 0.09 : 0.22 + pulseAmount * 0.12);
      ctx.strokeStyle = active ? "#ffd154" : "rgba(255,255,255,.72)";
      ctx.lineWidth = active ? 5 : 2;
      ctx.beginPath();
      ctx.arc(x, y, active ? 26 : 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 32, y);
      ctx.lineTo(x + 32, y);
      ctx.moveTo(x, y - 32);
      ctx.lineTo(x, y + 32);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawIdle(ctx) {
    const { actor, emergence, target, active } = this.idle;
    if (emergence) this.drawSelectionBadge(ctx, emergence, "EMERGE", "#48a9ff");
    if (target) this.drawSelectionBadge(ctx, target, "PREDICT", "#f05b4f", 52);
    if (!active && (emergence || target)) {
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = "rgba(20,24,31,.82)";
      roundRectPath(ctx, WIDTH / 2 - 150, 582, 300, 56, 14);
      ctx.fill();
      ctx.fillStyle = "#ffcf61";
      ctx.font = "900 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${actor}: SHOT DISABLED`, WIDTH / 2, 618);
      ctx.restore();
    }
  }

  drawSelectionBadge(ctx, spotId, label, color, yOffset = 0) {
    const spot = sniperSpot(spotId);
    const x = spot.x * WIDTH;
    const y = spot.y * HEIGHT + yOffset;
    ctx.save();
    ctx.fillStyle = "rgba(12,18,24,.88)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    roundRectPath(ctx, x - 78, y - 23, 156, 46, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${label}: ${spot.number}`, x, y + 6);
    ctx.restore();
  }

  drawReplayWorld(ctx, now) {
    const replay = this.replay || {};
    const p = this.progress;
    const emerge = easeOut(interval(p, TIMELINE.emergeStart, TIMELINE.emergeEnd));
    const aim = easeInOut(interval(p, TIMELINE.aimStart, TIMELINE.aimEnd));

    const reactionA = this.actorReaction("A", p, replay);
    const reactionB = this.actorReaction("B", p, replay);
    const recoilA = pulse(p, TIMELINE.shotAStart, TIMELINE.shotAStart + 0.085);
    const recoilB = pulse(p, TIMELINE.shotBStart, TIMELINE.shotBStart + 0.085);

    const actors = [
      { actor: "A", emergence: replay.emergenceA, target: replay.targetA, active: replay.activeA, color: "#4aa7ff", reaction: reactionA, recoil: recoilA },
      { actor: "B", emergence: replay.emergenceB, target: replay.targetB, active: replay.activeB, color: "#ef5a50", reaction: reactionB, recoil: recoilB }
    ].filter(item => item.emergence);

    actors.sort((left, right) => sniperSpot(left.emergence).y - sniperSpot(right.emergence).y);
    for (const actor of actors) {
      this.drawSoldier(ctx, { ...actor, emerge, aim, replay, now });
    }

    this.drawShot(ctx, {
      actor: "A",
      fromId: replay.emergenceA,
      targetId: replay.targetA,
      active: replay.activeA,
      hit: replay.hitByA,
      start: TIMELINE.shotAStart,
      impact: TIMELINE.shotAImpact,
      color: "#8fcfff",
      now
    });
    this.drawShot(ctx, {
      actor: "B",
      fromId: replay.emergenceB,
      targetId: replay.targetB,
      active: replay.activeB,
      hit: replay.hitByB,
      start: TIMELINE.shotBStart,
      impact: TIMELINE.shotBImpact,
      color: "#ff9d86",
      now
    });

    this.drawDisabledCue(ctx, "A", replay.emergenceA, replay.activeA, TIMELINE.shotAStart);
    this.drawDisabledCue(ctx, "B", replay.emergenceB, replay.activeB, TIMELINE.shotBStart);
  }

  drawReplayOverlay(ctx, now, camera) {
    const replay = this.replay || {};
    const p = this.progress;

    if (camera?.scope) {
      this.drawScopeOverlay(ctx, now, camera.scope);
    } else if (camera?.reactionActor && p < TIMELINE.resultStart) {
      const label = camera.reactionActor === "A" ? "PLAYER A REACTION" : "PLAYER B REACTION";
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = "rgba(8,12,16,.78)";
      ctx.strokeStyle = "rgba(255,218,126,.72)";
      ctx.lineWidth = 2;
      roundRectPath(ctx, 32, 32, 224, 45, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffe19a";
      ctx.font = "900 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, 144, 61);
      ctx.restore();
    }

    if (p > TIMELINE.resultStart) {
      const alpha = easeOut(interval(p, TIMELINE.resultStart, 1));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(10,14,20,.89)";
      ctx.strokeStyle = "rgba(255,199,70,.88)";
      ctx.lineWidth = 3;
      roundRectPath(ctx, WIDTH / 2 - 275, 76, 550, 92, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "900 36px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(sniperOutcomeLabel(replay), WIDTH / 2, 132);
      ctx.fillStyle = "#f7cf72";
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.fillText("HYBRID SCOPE REPLAY · CLEAN TRAINING IMPACT", WIDTH / 2, 154);
      ctx.restore();
    }

    if (this.paused && p < 1) {
      ctx.save();
      ctx.fillStyle = "rgba(4,7,10,.52)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(12,18,24,.92)";
      ctx.strokeStyle = "rgba(255,215,120,.85)";
      ctx.lineWidth = 3;
      roundRectPath(ctx, WIDTH / 2 - 112, HEIGHT / 2 - 48, 224, 96, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "900 29px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2 + 10);
      ctx.restore();
    }
  }

  drawScopeOverlay(ctx, now, scope) {
    const amount = clamp(scope.blend);
    const centreX = WIDTH / 2;
    const centreY = HEIGHT / 2;
    const radius = 270;
    const recoil = Number.isFinite(scope.recoil)
      ? scope.recoil
      : recoilEnvelope(this.progress, scope.shotStart, scope.shotStart + 0.095);
    const hold = Number.isFinite(scope.hold)
      ? scope.hold
      : easeOut(interval(this.progress, scope.lockStart, scope.shotStart));
    const acquisition = Number.isFinite(scope.acquisition)
      ? scope.acquisition
      : easeInOut(interval(this.progress, scope.start + 0.01, scope.lockStart));
    const breathAmplitude = lerp(6.5, 1.1, hold);
    const approachX = (scope.actor === "A" ? -24 : 24) * (1 - acquisition);
    const approachY = 16 * (1 - acquisition);
    const breathX = Math.sin(now / 430) * breathAmplitude;
    const breathY = Math.cos(now / 560) * breathAmplitude * 0.68;
    const crossX = centreX + approachX + breathX;
    const crossY = centreY + approachY + breathY - recoil * 26;

    ctx.save();
    ctx.globalAlpha = amount;

    // Darken only the area outside the scope. The previous destination-out
    // mask erased the already-rendered village and soldiers inside the lens.
    ctx.fillStyle = "rgba(2,5,7,.97)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(WIDTH, 0);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.moveTo(centreX + radius, centreY);
    ctx.arc(centreX, centreY, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill("evenodd");

    const lens = ctx.createRadialGradient(centreX - 55, centreY - 70, 20, centreX, centreY, radius);
    lens.addColorStop(0, "rgba(160,194,178,.08)");
    lens.addColorStop(0.72, "rgba(15,35,31,.08)");
    lens.addColorStop(1, "rgba(0,5,7,.48)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.arc(centreX, centreY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(8,12,14,.98)";
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(centreX, centreY, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(220,236,224,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centreX, centreY, radius - 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(235,245,235,.88)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centreX - radius + 18, crossY);
    ctx.lineTo(crossX - 24, crossY);
    ctx.moveTo(crossX + 24, crossY);
    ctx.lineTo(centreX + radius - 18, crossY);
    ctx.moveTo(crossX, centreY - radius + 18);
    ctx.lineTo(crossX, crossY - 24);
    ctx.moveTo(crossX, crossY + 24);
    ctx.lineTo(crossX, centreY + radius - 18);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i += 1) {
      const d = i * 38;
      ctx.beginPath();
      ctx.moveTo(crossX - 6, crossY + d);
      ctx.lineTo(crossX + 6, crossY + d);
      ctx.moveTo(crossX - 6, crossY - d);
      ctx.lineTo(crossX + 6, crossY - d);
      ctx.moveTo(crossX + d, crossY - 6);
      ctx.lineTo(crossX + d, crossY + 6);
      ctx.moveTo(crossX - d, crossY - 6);
      ctx.lineTo(crossX - d, crossY + 6);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(crossX, crossY, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    // The lock brackets tighten while the camera pans onto the stored prediction.
    const lockProgress = easeOut(interval(this.progress, scope.start + 0.018, scope.lockStart));
    const lockRadius = lerp(78, 28, lockProgress);
    ctx.save();
    ctx.globalAlpha = 0.24 + lockProgress * 0.7;
    ctx.strokeStyle = lockProgress > 0.92 ? "rgba(255,224,121,.96)" : "rgba(223,241,225,.72)";
    ctx.lineWidth = lockProgress > 0.92 ? 3.2 : 2;
    for (let corner = 0; corner < 4; corner += 1) {
      const angle = corner * Math.PI / 2 + Math.PI / 4;
      const cx = crossX + Math.cos(angle) * lockRadius;
      const cy = crossY + Math.sin(angle) * lockRadius;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(0, 13);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    const range = 115 + (sniperSpot(scope.targetId)?.number || 1) * 27;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(4,10,12,.62)";
    roundRectPath(ctx, centreX - 82, centreY + radius - 58, 164, 31, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(230,244,232,.9)";
    ctx.font = "800 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`RANGE ${range} M  ·  ${Math.round(lockProgress * 100)}% LOCK`, centreX, centreY + radius - 38);
    ctx.restore();

    // Keep the actual firing moment visible inside the lens. This deliberately
    // exaggerates the tracer slightly for classroom-scale displays.
    this.drawScopeShotFeedback(ctx, scope, {
      centreX, centreY, radius, crossX, crossY, recoil
    });

    if (recoil > 0) {
      ctx.save();
      ctx.globalAlpha = recoil * 0.24;
      ctx.fillStyle = "rgba(2,5,7,.78)";
      ctx.beginPath();
      ctx.arc(centreX, centreY, radius - 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centreX + 155, HEIGHT - 30 - recoil * 38);
    ctx.rotate(-0.17 - recoil * 0.035);
    ctx.fillStyle = "rgba(5,9,11,.96)";
    roundRectPath(ctx, -25, -34, 230, 42, 13);
    ctx.fill();
    ctx.fillStyle = "rgba(28,39,43,.96)";
    roundRectPath(ctx, 38, -50, 83, 20, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(7,11,13,.98)";
    roundRectPath(ctx, 117, -46, 116, 12, 5);
    ctx.fill();
    ctx.restore();

    if (recoil > 0) {
      ctx.fillStyle = `rgba(255,235,174,${0.11 * recoil})`;
      ctx.beginPath();
      ctx.arc(centreX, centreY, radius - 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(6,11,14,.88)";
    ctx.strokeStyle = scope.actor === "A" ? "rgba(98,178,255,.8)" : "rgba(255,112,96,.8)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, 38, 34, 238, 55, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.font = "900 18px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`PLAYER ${scope.actor} · SCOPE POV`, 58, 59);
    ctx.fillStyle = scope.active ? "#d7efdc" : "#ffd371";
    ctx.font = "800 13px system-ui, sans-serif";
    const status = !scope.active
      ? "TRIGGER LOCKED · ANSWER MISSED"
      : this.progress < scope.lockStart
        ? "TRACKING PREDICTED COVER"
        : this.progress < scope.shotStart
          ? "TARGET ACQUIRED · BREATH HELD"
          : this.progress < scope.impact
            ? "ROUND IN FLIGHT"
            : scope.hit ? "TAG CONFIRMED" : "IMPACT MISSED";
    ctx.fillText(status, 58, 79);
    ctx.restore();
  }

  drawScopeShotFeedback(ctx, scope, { centreX, centreY, radius, crossX, crossY, recoil }) {
    const p = this.progress;
    const barrelX = centreX + 176;
    const barrelY = centreY + 142 - recoil * 28;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centreX, centreY, radius - 15, 0, Math.PI * 2);
    ctx.clip();

    if (scope.active && p >= scope.shotStart && p <= scope.impact) {
      const travel = easeInOut(interval(p, scope.shotStart, scope.impact));
      const bulletX = lerp(barrelX, crossX, travel);
      const bulletY = lerp(barrelY, crossY, travel);
      const previous = clamp(travel - 0.22);
      const tailX = lerp(barrelX, crossX, previous);
      const tailY = lerp(barrelY, crossY, previous);
      const glow = 0.45 + Math.sin(travel * Math.PI) * 0.55;

      ctx.globalAlpha = glow;
      ctx.strokeStyle = "rgba(255,244,190,.34)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bulletX, bulletY);
      ctx.stroke();

      ctx.strokeStyle = scope.actor === "A" ? "#9ed8ff" : "#ffad94";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(bulletX, bulletY);
      ctx.stroke();

      ctx.fillStyle = "#fffbd8";
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // A small expanding pressure ring makes the projectile readable without
      // turning the classroom replay into a graphic combat scene.
      const wakeRadius = 8 + Math.sin(travel * Math.PI) * 14;
      ctx.globalAlpha = Math.sin(travel * Math.PI) * 0.72;
      ctx.strokeStyle = "rgba(255,246,211,.86)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bulletX, bulletY, wakeRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const flash = pulse(p, scope.shotStart, scope.shotStart + 0.055);
    if (scope.active && flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = "rgba(255,245,186,.96)";
      ctx.beginPath();
      ctx.moveTo(barrelX, barrelY);
      ctx.lineTo(barrelX - 55, barrelY - 28);
      ctx.lineTo(barrelX - 28, barrelY);
      ctx.lineTo(barrelX - 58, barrelY + 30);
      ctx.closePath();
      ctx.fill();
    }

    const smoke = pulse(p, scope.shotStart + 0.018, scope.shotStart + 0.13);
    if (scope.active && smoke > 0) {
      ctx.save();
      ctx.globalAlpha = smoke * 0.32;
      ctx.fillStyle = "rgba(224,229,218,.78)";
      for (let i = 0; i < 5; i += 1) {
        const drift = i * 11 + (1 - smoke) * 18;
        ctx.beginPath();
        ctx.arc(barrelX - drift, barrelY - 8 - i * 3, 7 + i * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const impact = pulse(p, scope.impact, scope.impact + 0.075);
    if (scope.active && impact > 0) {
      ctx.globalAlpha = impact;
      ctx.strokeStyle = scope.hit ? "#ffe079" : "rgba(235,217,177,.92)";
      ctx.lineWidth = scope.hit ? 6 : 4;
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        const inner = 10;
        const outer = scope.hit ? 48 : 32;
        ctx.beginPath();
        ctx.moveTo(crossX + Math.cos(angle) * inner, crossY + Math.sin(angle) * inner);
        ctx.lineTo(crossX + Math.cos(angle) * outer, crossY + Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(5,10,13,.88)";
      roundRectPath(ctx, crossX - 54, crossY - 82, 108, 31, 9);
      ctx.fill();
      ctx.fillStyle = scope.hit ? "#ffe079" : "white";
      ctx.font = "900 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(scope.hit ? "TAGGED" : "MISS", crossX, crossY - 61);
    }

    ctx.restore();
  }

  actorReaction(actor, p, replay) {
    const wasHit = actor === "A" ? Boolean(replay.hitByB) : Boolean(replay.hitByA);
    if (!wasHit) return { kick: 0, stagger: 0, recovery: 0, collapse: 0, knockedOut: false };
    const impact = actor === "A" ? TIMELINE.shotBImpact : TIMELINE.shotAImpact;
    const health = Number(actor === "A" ? replay.healthA : replay.healthB);
    const knockedOut = health <= 0;
    return {
      kick: pulse(p, impact, impact + 0.085),
      stagger: easeOut(interval(p, impact, impact + 0.17)),
      recovery: knockedOut ? 0 : easeInOut(interval(p, impact + 0.105, impact + 0.285)),
      collapse: knockedOut ? easeOut(interval(p, impact + 0.025, impact + 0.29)) : 0,
      knockedOut
    };
  }

  drawSoldier(ctx, { actor, emergence, target, active, color, emerge, aim, reaction, recoil, replay }) {
    if (!emergence || emerge <= 0) return;
    const spot = sniperSpot(emergence);
    const targetSpot = sniperSpot(target || emergence);
    const scale = SPOT_SCALE[emergence] || 0.78;
    const coverDrop = SPOT_COVER_DROP[emergence] || 42;
    const samePosition = replay?.emergenceA && replay?.emergenceA === replay?.emergenceB;
    const separation = samePosition ? (actor === "A" ? -15 : 15) : 0;
    const x = spot.x * WIDTH + separation;
    const hiddenY = spot.y * HEIGHT + coverDrop;
    const visibleY = spot.y * HEIGHT + 12;
    const y = lerp(hiddenY, visibleY, emerge);
    const direction = targetSpot.x >= spot.x ? 1 : -1;
    const reactionDirection = actor === "A" ? -1 : 1;
    const knockout = reaction.knockedOut;
    const liveStagger = reaction.stagger * (1 - reaction.recovery);
    const rotation = direction * recoil * -0.065 + reactionDirection * (
      reaction.kick * 0.28 +
      liveStagger * 0.19 +
      reaction.collapse * 0.5
    );
    const drop = liveStagger * 18 + reaction.collapse * 68;
    const sideShift = reactionDirection * (reaction.kick * 12 + liveStagger * 24 + reaction.collapse * 30);

    ctx.save();
    ctx.globalAlpha = emerge;
    ctx.translate(x + sideShift, y + drop);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // Contact shadow and cover grounding.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#071016";
    ctx.translate(0, 43);
    ctx.scale(1.45, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs and tactical boots.
    ctx.fillStyle = "#10161a";
    roundRectPath(ctx, -17, 24, 13, 34, 5); ctx.fill();
    roundRectPath(ctx, 4, 24, 13, 34, 5); ctx.fill();
    ctx.fillStyle = "#070b0e";
    roundRectPath(ctx, -20, 51, 18, 8, 3); ctx.fill();
    roundRectPath(ctx, 3, 51, 18, 8, 3); ctx.fill();

    // Torso, plate carrier and pouches.
    ctx.fillStyle = "#182126";
    ctx.strokeStyle = "rgba(0,0,0,.72)";
    ctx.lineWidth = 3;
    roundRectPath(ctx, -25, -22, 50, 58, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#242f33";
    roundRectPath(ctx, -20, -12, 40, 35, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.11)";
    ctx.lineWidth = 2;
    roundRectPath(ctx, -15, -7, 30, 23, 5); ctx.stroke();
    ctx.fillStyle = color;
    roundRectPath(ctx, actor === "A" ? -24 : 14, -5, 10, 23, 3); ctx.fill();
    ctx.fillStyle = "#11191d";
    roundRectPath(ctx, -21, 21, 14, 12, 3); ctx.fill();
    roundRectPath(ctx, 7, 21, 14, 12, 3); ctx.fill();

    // Head and helmet.
    ctx.fillStyle = "#70584a";
    ctx.beginPath(); ctx.arc(0, -36, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#151d21";
    ctx.beginPath(); ctx.arc(0, -41, 16, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(-16, -42, 32, 7);
    ctx.fillStyle = "rgba(18,25,29,.95)";
    roundRectPath(ctx, direction > 0 ? 3 : -13, -39, 10, 5, 2); ctx.fill();

    // Arms and rifle. The rifle extends towards the predicted position.
    ctx.save();
    ctx.scale(direction, 1);
    const aimLift = aim * 8;
    ctx.strokeStyle = "#202a2f";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(13, -8); ctx.lineTo(35, -13 - aimLift * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(29, -5 - aimLift * 0.1); ctx.stroke();
    ctx.strokeStyle = "#080d10";
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(18, -13 - aimLift * 0.16); ctx.lineTo(78, -17 - aimLift * 0.32); ctx.stroke();
    ctx.strokeStyle = "#38464c";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(42, -21 - aimLift * 0.22); ctx.lineTo(60, -23 - aimLift * 0.26); ctx.stroke();
    ctx.fillStyle = "#0a0f12";
    roundRectPath(ctx, 33, -22 - aimLift * 0.2, 18, 8, 3); ctx.fill();
    ctx.fillStyle = "#26343a";
    roundRectPath(ctx, 75, -19 - aimLift * 0.32, 13, 4, 2); ctx.fill();
    ctx.restore();

    // Strong but clean training-hit flash on the vest. The amber sensor stays
    // visible through the stagger so the successful tag is unmistakable.
    const sensor = Math.max(reaction.kick, liveStagger * 0.42, reaction.collapse * 0.28);
    if (sensor > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, sensor);
      ctx.fillStyle = "rgba(255,210,82,.92)";
      ctx.beginPath(); ctx.arc(0, 0, 18 + reaction.kick * 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 25 + reaction.kick * 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(19,24,28,.95)";
      roundRectPath(ctx, -15, -7, 30, 14, 4); ctx.fill();
      ctx.fillStyle = "#ffe07b";
      ctx.font = "900 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HIT", 0, 3);
      ctx.restore();
    }

    ctx.restore();

    if (!active) {
      ctx.save();
      ctx.globalAlpha = emerge * 0.95;
      ctx.fillStyle = "rgba(15,20,25,.9)";
      ctx.strokeStyle = "rgba(255,202,83,.82)";
      ctx.lineWidth = 2;
      roundRectPath(ctx, x - 70, y + 52 * scale, 140, 34, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffcf61";
      ctx.font = "900 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${actor} · SHOT DISABLED`, x, y + 74 * scale);
      ctx.restore();
    }
  }

  drawShot(ctx, { actor, fromId, targetId, active, hit, start, impact, color, now }) {
    if (!fromId || !targetId || !active) return;
    const p = this.progress;
    if (p < start - 0.02 || p > impact + 0.22) return;

    const from = this.actorMuzzle(actor, fromId, targetId);
    const end = this.impactPoint(actor, targetId, hit);
    const travel = easeInOut(interval(p, start, impact));
    const shotVisible = p >= start && p <= impact;

    if (p >= start && p <= start + 0.055) {
      const flash = pulse(p, start, start + 0.055);
      this.drawMuzzleFlash(ctx, from.x, from.y, from.direction, flash, color);
    }

    if (shotVisible) {
      const x = lerp(from.x, end.x, travel);
      const y = lerp(from.y, end.y, travel);
      const vx = end.x - from.x;
      const vy = end.y - from.y;
      const length = Math.max(1, Math.hypot(vx, vy));
      const ux = vx / length;
      const uy = vy / length;
      const tail = Math.min(115, length * 0.26);

      ctx.save();
      ctx.globalAlpha = 0.22 + 0.78 * Math.sin(travel * Math.PI);
      ctx.strokeStyle = "rgba(255,245,203,.34)";
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x - ux * tail, y - uy * tail); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - ux * tail, y - uy * tail); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = "#fff8cf";
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (p >= impact) {
      const amount = pulse(p, impact, impact + 0.2);
      if (amount > 0) {
        if (hit) this.drawHitImpact(ctx, end.x, end.y, amount, actor, now);
        else this.drawEnvironmentImpact(ctx, end.x, end.y, amount, actor, now);
      }
    }
  }

  actorMuzzle(actor, fromId, targetId) {
    const from = sniperSpot(fromId);
    const target = sniperSpot(targetId);
    const scale = SPOT_SCALE[fromId] || 0.78;
    const samePosition = this.replay?.emergenceA === this.replay?.emergenceB;
    const separation = samePosition ? (actor === "A" ? -15 : 15) : 0;
    const direction = target.x >= from.x ? 1 : -1;
    return {
      x: from.x * WIDTH + separation + direction * 84 * scale,
      y: from.y * HEIGHT - 4 * scale,
      direction
    };
  }

  impactPoint(actor, targetId, hit) {
    const target = sniperSpot(targetId);
    const samePosition = this.replay?.emergenceA === this.replay?.emergenceB && hit;
    const targetActor = actor === "A" ? "B" : "A";
    const separation = samePosition ? (targetActor === "A" ? -15 : 15) : 0;
    if (hit) {
      return { x: target.x * WIDTH + separation, y: target.y * HEIGHT + 12 };
    }
    const sign = actor === "A" ? 1 : -1;
    const number = target.number || 1;
    return {
      x: target.x * WIDTH + sign * (32 + number * 5),
      y: target.y * HEIGHT + (number % 2 ? -28 : 24)
    };
  }

  drawMuzzleFlash(ctx, x, y, direction, amount, color) {
    if (amount <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    ctx.globalAlpha = amount;
    ctx.fillStyle = "rgba(255,248,189,.95)";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(29 + amount * 24, -11); ctx.lineTo(18, 0); ctx.lineTo(31 + amount * 18, 12); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(20 + amount * 15, -5); ctx.lineTo(14, 0); ctx.lineTo(20 + amount * 15, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawHitImpact(ctx, x, y, amount, actor, now) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = amount;
    ctx.strokeStyle = "#ffe07b";
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4 + (actor === "A" ? 0.12 : -0.12);
      const inner = 12;
      const outer = 30 + amount * 24;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(235,218,173,.58)";
    for (let i = 0; i < 10; i += 1) {
      const angle = i * 0.82 + now / 1300;
      const distance = 12 + i * 3.2 * amount;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.65, 3 + i % 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(13,18,23,.9)";
    roundRectPath(ctx, -55, -72, 110, 31, 9); ctx.fill();
    ctx.fillStyle = "#ffe07b";
    ctx.font = "900 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TAGGED", 0, -51);
    ctx.restore();
  }

  drawEnvironmentImpact(ctx, x, y, amount, actor, now) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = amount;
    ctx.fillStyle = "rgba(207,182,136,.82)";
    for (let i = 0; i < 14; i += 1) {
      const angle = i * 0.67 + (actor === "A" ? 0.25 : -0.25) + now / 2500;
      const distance = 8 + i * 3.8 * amount;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.68, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,225,161,.9)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * 28 * amount, Math.sin(angle) * 20 * amount); ctx.stroke();
    }
    ctx.fillStyle = "rgba(13,18,23,.88)";
    roundRectPath(ctx, -42, -62, 84, 29, 8); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "900 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MISS", 0, -42);
    ctx.restore();
  }

  drawDisabledCue(ctx, actor, spotId, active, start) {
    if (!spotId || active) return;
    const p = this.progress;
    const amount = pulse(p, start, start + 0.16);
    if (amount <= 0) return;
    const spot = sniperSpot(spotId);
    const x = spot.x * WIDTH;
    const y = spot.y * HEIGHT - 38;
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.fillStyle = "rgba(13,18,23,.92)";
    ctx.strokeStyle = "#ffcd63";
    ctx.lineWidth = 3;
    roundRectPath(ctx, x - 75, y - 24, 150, 48, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffcd63";
    ctx.font = "900 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${actor}: CLICK`, x, y + 6);
    ctx.restore();
  }

  drawVignette(ctx) {
    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 250, WIDTH / 2, HEIGHT / 2, 820);
    vignette.addColorStop(0, "rgba(4,7,12,0)");
    vignette.addColorStop(1, "rgba(4,7,12,.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function roundRectPath(ctx, x, y, width, height, radius = 0) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lerp(a, b, amount) { return a + (b - a) * clamp(amount); }
function interval(value, start, end) { return clamp((value - start) / Math.max(0.0001, end - start)); }
function pulse(value, start, end) { return Math.sin(clamp((value - start) / Math.max(0.0001, end - start)) * Math.PI); }
function recoilEnvelope(value, start, end) {
  if (value < start || value > end) return 0;
  const kickEnd = start + (end - start) * 0.22;
  if (value <= kickEnd) return easeOut(interval(value, start, kickEnd));
  return 1 - easeOut(interval(value, kickEnd, end));
}
function easeOut(value) { return 1 - Math.pow(1 - clamp(value), 3); }
function easeInOut(value) { const t = clamp(value); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function clamp(value, min = 0, max = 1) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function performanceNow() { return globalThis.performance?.now?.() ?? Date.now(); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export { sniperSpotLabel, TIMELINE as SNIPER_REPLAY_TIMELINE };
