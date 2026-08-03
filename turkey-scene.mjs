import { turkeyMove, turkeyMoveLabel, turkeyOutcomeLabel, turkeyTone } from "./turkey-core.mjs";

const WIDTH = 1280;
const HEIGHT = 720;
const raf = globalThis.requestAnimationFrame || (callback => setTimeout(() => callback(Date.now()), 16));
const BARN_BACKGROUND_SRC = "./assets/turkey-barn-background.jpg";

export class TurkeyFightScene {
  constructor(canvas, captionElement = null, { reducedMotion = false, onEvent = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext?.("2d") || null;
    this.captionElement = captionElement;
    this.reducedMotion = Boolean(reducedMotion);
    this.onEvent = typeof onEvent === "function" ? onEvent : () => {};
    this.mode = "idle";
    this.idle = { actor: "A", active: true, preview: null };
    this.replay = null;
    this.progress = 0;
    this.startedAt = 0;
    this.duration = 4500;
    this.emitted = new Set();
    this.particles = [];
    this.backgroundImage = null;
    this.backgroundImageReady = false;
    this.backgroundFailed = false;
    this.loadBackgroundImage(BARN_BACKGROUND_SRC);
    if (this.canvas) {
      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      if (this.canvas.style) {
        this.canvas.style.display = "block";
        this.canvas.style.visibility = "visible";
        this.canvas.style.opacity = "1";
      }
    }
    this.drawSafely(0);
    // Redraw after the hidden canvas has entered layout. This avoids a blank
    // arena in browsers that calculate percentage canvas heights late.
    raf(() => this.drawSafely(performanceNow()));
    setTimeout(() => this.drawSafely(performanceNow()), 80);
  }

  loadBackgroundImage(src) {
    if (!src || typeof Image === "undefined") return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      this.backgroundImage = image;
      this.backgroundImageReady = true;
      this.backgroundFailed = false;
      this.drawSafely(performanceNow());
    };
    image.onerror = () => {
      this.backgroundFailed = true;
      this.backgroundImageReady = false;
      this.backgroundImage = null;
    };
    image.src = src;
  }

  setCaption(text, tone = "") {
    if (!this.captionElement) return;
    this.captionElement.textContent = String(text || "");
    this.captionElement.className = `scene-caption turkey-caption ${tone}`.trim();
  }

  setIdle({ actor = "A", active = true, preview = null, caption = "Choose a move in the farm arena." } = {}) {
    this.mode = "idle";
    this.idle = { actor, active: Boolean(active), preview };
    this.replay = null;
    this.progress = 0;
    this.setCaption(caption, active ? "" : "futile");
    this.drawSafely(performanceNow());
  }

  async playReplay(replay) {
    this.mode = "replay";
    this.replay = structuredClone(replay || {});
    this.progress = 0;
    this.emitted.clear();
    this.particles = [];
    this.setCaption("Both moves are locked. Feathers ready…", "");
    this.emitOnce("fight-start", { type: "fight-start", replay: this.replay });

    if (this.reducedMotion) {
      this.progress = 1;
      this.emitReplayEvents(1);
      this.drawSafely(performanceNow());
      await wait(220);
      return;
    }

    this.startedAt = performanceNow();
    await new Promise(resolve => {
      const tick = now => {
        this.progress = clamp((now - this.startedAt) / this.duration, 0, 1);
        this.emitReplayEvents(this.progress);
        this.drawSafely(now);
        if (this.progress < 1) raf(tick);
        else resolve();
      };
      raf(tick);
    });
  }

  emitReplayEvents(progress) {
    const replay = this.replay || {};
    if (progress >= 0.12) this.emitOnce("gobble", { type: "gobble" });
    if (progress >= 0.2) this.emitOnce("move-a", { type: "move", actor: "A", move: replay.moveA });
    if (progress >= 0.38) this.emitOnce("impact-a", { type: "impact", actor: "A", damage: Number(replay.damageToB || 0) });
    if (progress >= 0.52) this.emitOnce("move-b", { type: "move", actor: "B", move: replay.moveB });
    if (progress >= 0.7) this.emitOnce("impact-b", { type: "impact", actor: "B", damage: Number(replay.damageToA || 0) });
    if (progress >= 0.88) {
      this.emitOnce("result", { type: "fight-result", completed: Boolean(replay.completed), replay });
      this.setCaption(replay.caption || turkeyOutcomeLabel(replay), turkeyTone(replay));
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
      this.canvas?.closest?.(".turkey-scene")?.classList.add("render-ready");
      this.canvas?.removeAttribute?.("data-render-error");
      return true;
    } catch (error) {
      console.error("Turkey Fight scene render failed", error);
      this.canvas?.setAttribute?.("data-render-error", String(error?.message || error));
      this.canvas?.closest?.(".turkey-scene")?.classList.remove("render-ready");
      return false;
    }
  }

  draw(now = performanceNow()) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawBackground(ctx, now);

    const state = this.sceneState();
    const camera = this.cameraState();
    ctx.save();
    ctx.translate(WIDTH / 2 + camera.shakeX, 560 + camera.shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-WIDTH / 2, -560);
    this.drawGroundMarks(ctx);
    this.drawFighter(ctx, "A", state.A, now);
    this.drawFighter(ctx, "B", state.B, now);
    this.drawEffects(ctx, state, now);
    this.drawForegroundDepth(ctx, state, now);
    ctx.restore();
    this.drawVignette(ctx);
  }

  cameraState() {
    if (this.mode !== "replay") return { zoom: 1.035, shakeX: 0, shakeY: 0 };
    const p = this.progress;
    const approach = interval(p, 0.02, 0.16);
    const impact = Math.max(pulse(p, 0.34, 0.45), pulse(p, 0.66, 0.77));
    const shake = this.reducedMotion ? 0 : impact * Math.sin(p * Math.PI * 92);
    return {
      zoom: 1.045 + approach * 0.025 + impact * 0.035,
      shakeX: shake * 7,
      shakeY: shake * 2.5
    };
  }

  sceneState() {
    const layout = turkeyChoreography(this.progress, this.mode);
    const base = {
      A: { ...layout.A, facing: 1, move: null, active: true, action: 0, guard: 0, hit: 0, victory: 0 },
      B: { ...layout.B, facing: -1, move: null, active: true, action: 0, guard: 0, hit: 0, victory: 0 }
    };

    if (this.mode === "idle") {
      const selected = base[this.idle.actor] || base.A;
      selected.move = this.idle.preview;
      selected.active = this.idle.active;
      selected.action = this.idle.preview ? 0.28 : 0;
      return base;
    }

    const replay = this.replay || {};
    const p = this.progress;
    const moveA = turkeyMove(replay.moveA);
    const moveB = turkeyMove(replay.moveB);
    base.A.move = replay.moveA;
    base.A.active = Boolean(replay.activeA);
    base.B.move = replay.moveB;
    base.B.active = Boolean(replay.activeB);

    // Each strike now reaches maximum extension at the stored impact beat.
    base.A.action = interval(p, 0.18, 0.56);
    base.B.action = interval(p, 0.50, 0.90);

    // A defence is shown during the opponent's incoming attack instead of
    // appearing after the contact has already happened.
    if (moveB.type === "defence" && base.B.active) base.B.guard = interval(p, 0.20, 0.56);
    if (moveA.type === "defence" && base.A.active) base.A.guard = interval(p, 0.52, 0.88);

    base.B.hit = pulse(p, 0.35, 0.51) * Math.min(1, Number(replay.damageToB || 0) / 14);
    base.A.hit = pulse(p, 0.67, 0.83) * Math.min(1, Number(replay.damageToA || 0) / 14);

    if (p > 0.88 && replay.completed) {
      base.A.victory = replay.winner === "A" ? interval(p, 0.88, 1) : 0;
      base.B.victory = replay.winner === "B" ? interval(p, 0.88, 1) : 0;
    }
    return base;
  }

  drawBackground(ctx, now) {
    if (this.backgroundImageReady && this.backgroundImage) {
      this.drawPhotoBackground(ctx, now);
      return;
    }

    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#77d9f4");
    sky.addColorStop(0.58, "#d5f3f3");
    sky.addColorStop(0.59, "#8fca68");
    sky.addColorStop(1, "#3c7b3f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.9;
    const sun = ctx.createRadialGradient(1085, 112, 8, 1085, 112, 94);
    sun.addColorStop(0, "rgba(255,246,174,1)");
    sun.addColorStop(0.34, "rgba(255,211,78,.96)");
    sun.addColorStop(1, "rgba(255,211,78,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(980, 8, 210, 210);
    ctx.restore();

    this.drawCloud(ctx, 170 + Math.sin(now / 4400) * 8, 112, 1.1);
    this.drawCloud(ctx, 690 + Math.sin(now / 5200 + 2) * 10, 88, 0.72);

    ctx.fillStyle = "#75b65b";
    ctx.beginPath();
    ctx.moveTo(0, 430);
    ctx.quadraticCurveTo(190, 292, 430, 408);
    ctx.quadraticCurveTo(690, 272, 960, 406);
    ctx.quadraticCurveTo(1120, 326, 1280, 390);
    ctx.lineTo(1280, 560);
    ctx.lineTo(0, 560);
    ctx.closePath();
    ctx.fill();

    this.drawBarn(ctx);
    this.drawFence(ctx);

    const ground = ctx.createLinearGradient(0, 430, 0, 720);
    ground.addColorStop(0, "rgba(94,156,67,.18)");
    ground.addColorStop(1, "rgba(32,91,50,.55)");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 430, WIDTH, 290);
  }

  drawPhotoBackground(ctx, now) {
    const image = this.backgroundImage;
    const baseScale = Math.max(WIDTH / image.width, HEIGHT / image.height);
    const zoom = 1.08;
    const scale = baseScale * zoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const orbit = Math.sin(now / 7000) * 16;
    const focusX = WIDTH * 0.54;
    const focusY = HEIGHT * 0.46;
    const sx = focusX - drawWidth / 2 + orbit;
    const sy = focusY - drawHeight / 2 - 8;
    ctx.drawImage(image, sx, sy, drawWidth, drawHeight);

    const warm = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    warm.addColorStop(0, "rgba(255,209,148,.16)");
    warm.addColorStop(0.55, "rgba(255,170,108,.08)");
    warm.addColorStop(1, "rgba(34,55,29,.28)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const fightZone = ctx.createRadialGradient(WIDTH * 0.5, 530, 50, WIDTH * 0.5, 560, 500);
    fightZone.addColorStop(0, "rgba(255,231,182,.05)");
    fightZone.addColorStop(0.45, "rgba(49,76,34,.16)");
    fightZone.addColorStop(1, "rgba(18,35,23,.34)");
    ctx.fillStyle = fightZone;
    ctx.fillRect(0, 420, WIDTH, 300);

    this.drawSunRays(ctx, 160, 245, now);
    this.drawAtmosphereDust(ctx, now);
  }

  drawSunRays(ctx, x, y, now) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.18;
    ctx.rotate(-0.3 + Math.sin(now / 6000) * 0.03);
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.rotate(-0.42 + i * 0.15);
      const ray = ctx.createLinearGradient(0, 0, 0, 420);
      ray.addColorStop(0, "rgba(255,236,189,.85)");
      ray.addColorStop(1, "rgba(255,236,189,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.lineTo(70, 420);
      ctx.lineTo(-70, 420);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawAtmosphereDust(ctx, now) {
    ctx.save();
    for (let i = 0; i < 18; i += 1) {
      const drift = (now / 65 + i * 31) % (WIDTH + 140) - 70;
      const rise = ((i * 53 + now / 22) % 300);
      const size = 2 + (i % 4);
      ctx.globalAlpha = 0.06 + (i % 3) * 0.02;
      ctx.fillStyle = i % 2 ? "#ffecc7" : "#f5d8aa";
      ctx.beginPath();
      ctx.arc(drift, 630 - rise, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#ffffff";
    for (const part of [[0, 18, 55, 25], [42, 0, 52, 42], [83, 13, 62, 30], [35, 22, 90, 24]]) {
      ctx.beginPath();
      ctx.ellipse(part[0], part[1], part[2], part[3], 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBarn(ctx) {
    ctx.save();
    ctx.translate(640, 276);
    ctx.fillStyle = "rgba(30,53,44,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 170, 230, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8e332a";
    ctx.beginPath();
    ctx.moveTo(-175, 28);
    ctx.lineTo(0, -92);
    ctx.lineTo(175, 28);
    ctx.lineTo(175, 158);
    ctx.lineTo(-175, 158);
    ctx.closePath();
    ctx.fill();

    const wall = ctx.createLinearGradient(-170, 0, 175, 0);
    wall.addColorStop(0, "#bd4938");
    wall.addColorStop(0.5, "#dd6650");
    wall.addColorStop(1, "#9f352e");
    ctx.fillStyle = wall;
    ctx.fillRect(-165, 25, 330, 133);

    ctx.strokeStyle = "rgba(91,34,29,.45)";
    ctx.lineWidth = 5;
    for (let x = -145; x <= 145; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 154);
      ctx.stroke();
    }

    ctx.fillStyle = "#f3d5a4";
    ctx.fillRect(-58, 65, 116, 93);
    ctx.fillStyle = "#66322c";
    ctx.fillRect(-48, 75, 96, 83);
    ctx.strokeStyle = "#f3d5a4";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-45, 78);
    ctx.lineTo(45, 152);
    ctx.moveTo(45, 78);
    ctx.lineTo(-45, 152);
    ctx.stroke();
    ctx.restore();
  }

  drawFence(ctx) {
    ctx.save();
    ctx.translate(0, 420);
    ctx.fillStyle = "#e6cf97";
    ctx.strokeStyle = "#b4935b";
    ctx.lineWidth = 4;
    for (let x = 10; x < WIDTH; x += 74) {
      ctx.beginPath();
      roundRectPath(ctx, x, -18, 16, 112, 5);
      ctx.fill();
      ctx.stroke();
    }
    for (const y of [15, 66]) {
      ctx.beginPath();
      roundRectPath(ctx, 0, y, WIDTH, 16, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGroundMarks(ctx) {
    ctx.save();
    if (this.backgroundImageReady) {
      ctx.fillStyle = "rgba(30,61,28,.14)";
      ctx.beginPath();
      ctx.ellipse(WIDTH / 2, 605, 360, 58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(246,232,193,.18)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(WIDTH / 2, 610 + i * 8, 310 + i * 14, 28 + i * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "rgba(229,248,198,.18)";
      ctx.lineWidth = 4;
      for (let y = 520; y < 720; y += 38) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(WIDTH / 2, y - 12, WIDTH, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawFighter(ctx, actor, fighter, now) {
    const move = turkeyMove(fighter.move);
    const attacking = move.type === "attack" && fighter.active;
    const lunge = attacking ? Math.sin(Math.PI * clamp(fighter.action, 0, 1)) : 0;
    const targetDirection = actor === "A" ? 1 : -1;
    const travel = turkeyAttackTravel(move.id);
    const visualAction = Math.max(fighter.action, fighter.guard || 0);
    const x = fighter.x + targetDirection * travel * lunge - targetDirection * fighter.hit * 44;
    const idleBob = Math.sin(now / 520 + (actor === "A" ? 0 : 2.4)) * 3;
    const duck = fighter.active && move.id === "duck" ? 24 * Math.sin(Math.PI * visualAction) : 0;
    const y = fighter.y + idleBob + duck;
    const lean = attacking ? targetDirection * (move.id === "charge" ? 0.18 : 0.08) * lunge : -targetDirection * fighter.hit * 0.16;
    const squash = fighter.hit ? 1 - fighter.hit * 0.1 : 1;
    const lift = fighter.victory ? Math.sin(fighter.victory * Math.PI * 3) * 10 : 0;
    const scale = Number(fighter.scale || 1);

    ctx.save();
    ctx.translate(x, y - lift);
    ctx.scale(fighter.facing * scale, scale);
    ctx.rotate(lean * fighter.facing);
    ctx.scale(1, squash);

    this.drawShadow(ctx, fighter.hit, attacking ? lunge : 0);
    this.drawTurkey(ctx, actor, {
      move,
      active: fighter.active,
      action: visualAction,
      hit: fighter.hit,
      victory: fighter.victory
    });
    ctx.restore();
  }

  drawShadow(ctx, hit, lunge) {
    ctx.save();
    const longShadowAlpha = this.backgroundImageReady ? 0.16 - hit * 0.05 : 0.1;
    if (longShadowAlpha > 0) {
      ctx.globalAlpha = longShadowAlpha;
      ctx.fillStyle = "#18331f";
      ctx.beginPath();
      ctx.ellipse(62 + lunge * 32, 36, 182, 30, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.scale(1, 0.32);
    const gradient = ctx.createRadialGradient(0, 0, 8, 0, 0, 120);
    gradient.addColorStop(0, `rgba(26,55,37,${0.34 - hit * 0.08})`);
    gradient.addColorStop(1, "rgba(26,55,37,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(-12 + lunge * 20, 18, 135, 68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTurkey(ctx, actor, pose) {
    const { move, active, action, hit, victory } = pose;
    const t = Math.sin(Math.PI * clamp(action, 0, 1));
    const futile = !active && move.id !== "unknown";
    ctx.globalAlpha = futile ? 0.72 : 1;

    // Tail fan: layered feathers create the 2.5D silhouette.
    ctx.save();
    ctx.translate(-62, -105);
    const tailLift = victory ? victory * 0.25 : 0;
    ctx.rotate(-0.1 - tailLift);
    const featherColors = actor === "A"
      ? ["#5e2f2b", "#b94e33", "#ef9d48", "#71372c", "#d86d3d", "#f4ba5f", "#6a342c"]
      : ["#252a4e", "#3a4c83", "#5f6ca7", "#9d4776", "#39406f", "#6b75b5", "#242b55"];
    for (let index = 0; index < 11; index += 1) {
      const angle = -1.05 + index * 0.21;
      ctx.save();
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, -150, 0, 20);
      grad.addColorStop(0, featherColors[index % featherColors.length]);
      grad.addColorStop(1, shade(featherColors[index % featherColors.length], -22));
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(55,28,32,.48)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -74, 31, 93, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,240,200,.26)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, -150);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Back leg and front leg.
    this.drawLeg(ctx, -22, -15, hit, false);
    this.drawLeg(ctx, 29, -12, hit, true);

    // Body volume.
    ctx.save();
    ctx.translate(-8, -92);
    ctx.rotate(hit * -0.1);
    const body = ctx.createRadialGradient(-32, -45, 10, 8, -2, 120);
    if (actor === "A") {
      body.addColorStop(0, "#a76643");
      body.addColorStop(0.52, "#71402f");
      body.addColorStop(1, "#3e2827");
    } else {
      body.addColorStop(0, "#6672a8");
      body.addColorStop(0.52, "#343b68");
      body.addColorStop(1, "#202445");
    }
    ctx.fillStyle = body;
    ctx.strokeStyle = actor === "A" ? "#432923" : "#1a1f42";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 92, 108, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawWing(ctx, actor, move, t, active);

    // Neck and head. Peck extends them forward.
    const peck = active && move.id === "peck" ? t : 0;
    const charge = active && move.id === "charge" ? t : 0;
    ctx.save();
    ctx.translate(54 + peck * 54 + charge * 18, -170 + peck * 11);
    ctx.rotate(-0.08 + peck * 0.16);
    const neck = ctx.createLinearGradient(-20, -20, 36, 70);
    neck.addColorStop(0, actor === "A" ? "#e05b4f" : "#5b77bc");
    neck.addColorStop(1, actor === "A" ? "#a92e37" : "#2d386f");
    ctx.fillStyle = neck;
    ctx.beginPath();
    roundRectPath(ctx, -22, 25, 44, 95, 21);
    ctx.fill();

    const head = ctx.createRadialGradient(-12, -13, 4, 0, 0, 50);
    head.addColorStop(0, actor === "A" ? "#f06f61" : "#7896d7");
    head.addColorStop(1, actor === "A" ? "#b9343d" : "#35477d");
    ctx.fillStyle = head;
    ctx.strokeStyle = actor === "A" ? "#852630" : "#25305d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 5, 38, 45, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye, brow and beak.
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(17, -2, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#171522";
    ctx.beginPath();
    ctx.arc(20, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3b1b20";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(7, -16);
    ctx.lineTo(28, -11 - (move.type === "attack" ? 4 : 0));
    ctx.stroke();

    const beak = ctx.createLinearGradient(28, 0, 70, 8);
    beak.addColorStop(0, "#ffd759");
    beak.addColorStop(1, "#e99625");
    ctx.fillStyle = beak;
    ctx.beginPath();
    ctx.moveTo(31, 4);
    ctx.lineTo(74, 14);
    ctx.lineTo(31, 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = actor === "A" ? "#b72f3b" : "#922c65";
    ctx.beginPath();
    ctx.ellipse(9, 43, 12, 29, 0.14, 0, Math.PI * 2);
    ctx.fill();

    this.drawAccessory(ctx, actor, victory);
    ctx.restore();

    if (futile) this.drawFutileSpark(ctx);
  }

  drawWing(ctx, actor, move, t, active) {
    const slap = active && move.id === "wing-slap" ? t : 0;
    const block = active && move.id === "block" ? t : 0;
    const counter = active && move.id === "counter" ? t : 0;
    ctx.save();
    ctx.translate(24, -100);
    ctx.rotate(-0.2 - slap * 1.25 + block * 0.75 - counter * 0.35);
    const wing = ctx.createLinearGradient(-35, -55, 70, 45);
    wing.addColorStop(0, actor === "A" ? "#c77b4a" : "#7080bc");
    wing.addColorStop(1, actor === "A" ? "#5d322c" : "#29305d");
    ctx.fillStyle = wing;
    ctx.strokeStyle = actor === "A" ? "#4b2c29" : "#1f254c";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-33, -18);
    ctx.quadraticCurveTo(10, -78 - slap * 40, 88 + slap * 58, -25);
    ctx.quadraticCurveTo(65, 35, 5, 48);
    ctx.quadraticCurveTo(-30, 26, -33, -18);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeStyle = "rgba(255,235,195,.24)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, -3 + i * 9);
      ctx.lineTo(62 + slap * 42, -28 + i * 11);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLeg(ctx, x, y, hit, front) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#d99033";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo((front ? 8 : -5) + hit * 12, 34);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(front ? 8 : -5, 34);
    ctx.lineTo(31, 44);
    ctx.moveTo(front ? 8 : -5, 34);
    ctx.lineTo(11, 51);
    ctx.moveTo(front ? 8 : -5, 34);
    ctx.lineTo(-10, 46);
    ctx.stroke();
    ctx.restore();
  }

  drawAccessory(ctx, actor, victory) {
    if (actor === "A") {
      ctx.save();
      ctx.translate(-6, -39 - victory * 8);
      ctx.fillStyle = "#f8c944";
      ctx.strokeStyle = "#9f6c0e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, 10);
      ctx.lineTo(-22, -20);
      ctx.lineTo(-8, -5);
      ctx.lineTo(2, -25);
      ctx.lineTo(15, -4);
      ctx.lineTo(28, -19);
      ctx.lineTo(25, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#d9406c";
      ctx.fillRect(-35, -24, 69, 10);
      ctx.beginPath();
      ctx.moveTo(-32, -14);
      ctx.lineTo(-70, -1);
      ctx.lineTo(-36, 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawFutileSpark(ctx) {
    ctx.save();
    ctx.translate(68, -230);
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, 12);
    ctx.moveTo(12, -12);
    ctx.lineTo(-12, 12);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(ctx, state, now) {
    if (this.mode !== "replay") return;
    const replay = this.replay || {};
    const p = this.progress;

    this.drawGuardEffect(ctx, "B", replay.moveB, replay.activeB, state.B.guard, state.B);
    this.drawActionEffect(ctx, "A", replay.moveA, replay.activeA, state.A.action, Number(replay.damageToB || 0), 0.38, state.A, state.B);
    this.drawGuardEffect(ctx, "A", replay.moveA, replay.activeA, state.A.guard, state.A);
    this.drawActionEffect(ctx, "B", replay.moveB, replay.activeB, state.B.action, Number(replay.damageToA || 0), 0.7, state.B, state.A);

    if (p >= 0.88) {
      const alpha = easeOut(interval(p, 0.88, 1));
      ctx.save();
      ctx.translate(WIDTH / 2, 168);
      ctx.rotate(-0.025);
      ctx.globalAlpha = alpha;
      ctx.font = "900 55px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 12;
      ctx.strokeStyle = "rgba(255,255,255,.92)";
      ctx.fillStyle = replay.completed ? "#6c2fa2" : Number(replay.damageToA || 0) + Number(replay.damageToB || 0) ? "#b22f3f" : "#356382";
      const text = turkeyOutcomeLabel(replay);
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    // Drifting feathers after impacts.
    const totalDamage = Number(replay.damageToA || 0) + Number(replay.damageToB || 0);
    if (totalDamage > 0 && p > 0.35) {
      ctx.save();
      for (let i = 0; i < 18; i += 1) {
        const seed = i * 31.7;
        const start = i % 2 === 0 ? 0.36 : 0.68;
        const fp = clamp((p - start) / 0.42, 0, 1);
        if (!fp) continue;
        const direction = i % 2 === 0 ? 1 : -1;
        const x = 640 + direction * (45 + (i % 5) * 17) * fp + Math.sin(seed) * 28;
        const y = 380 - Math.sin(fp * Math.PI) * (70 + (i % 4) * 16) + fp * 90;
        ctx.translate(x, y);
        ctx.rotate(seed + now / 420);
        ctx.fillStyle = i % 3 === 0 ? "#f0a04e" : i % 3 === 1 ? "#6f3a31" : "#5967a2";
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.setTransform?.(1, 0, 0, 1, 0, 0);
      }
      ctx.restore();
    }
  }

  drawGuardEffect(ctx, actor, moveId, active, action, fighter) {
    if (!moveId || action <= 0 || !fighter) return;
    const move = turkeyMove(moveId);
    if (move.type !== "defence") return;
    const direction = actor === "A" ? 1 : -1;
    const alpha = Math.sin(Math.PI * clamp(action, 0, 1));
    ctx.save();
    ctx.globalAlpha = alpha * (active ? 1 : 0.35);
    ctx.translate(fighter.x + direction * 102, fighter.y - 196);
    ctx.scale(direction, 1);
    ctx.strokeStyle = move.id === "counter" ? "#f6c84d" : "rgba(219,244,255,.94)";
    ctx.fillStyle = "rgba(55,102,150,.2)";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(0, 0, move.id === "duck" ? 58 : 82, -1.35, 1.35);
    ctx.stroke();
    if (move.id === "duck") {
      ctx.font = "900 30px system-ui";
      ctx.fillStyle = "white";
      ctx.fillText("WHOOSH", -38, -82);
    }
    ctx.restore();
  }

  drawActionEffect(ctx, actor, moveId, active, action, damage, impactAt, attacker, defender) {
    if (!moveId || action <= 0 || !attacker || !defender) return;
    const move = turkeyMove(moveId);
    if (move.type === "defence") {
      this.drawGuardEffect(ctx, actor, moveId, active, action, attacker);
      return;
    }
    const direction = actor === "A" ? 1 : -1;
    const originX = attacker.x + direction * 72;
    const targetX = defender.x - direction * 108;
    const originY = attacker.y - 190;
    const targetY = defender.y - 190;
    const alpha = Math.sin(Math.PI * action);
    ctx.save();
    ctx.globalAlpha = alpha * (active ? 1 : 0.35);
    ctx.strokeStyle = active ? "rgba(255,247,174,.9)" : "rgba(255,255,255,.35)";
    ctx.lineWidth = move.id === "charge" ? 14 : 8;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(originX - direction * i * 20, originY + i * 24);
      ctx.lineTo(targetX - direction * 18, targetY + i * 11);
      ctx.stroke();
    }
    ctx.restore();

    const impactWindow = pulse(this.progress, impactAt - 0.035, impactAt + 0.095);
    if (!impactWindow) return;
    this.drawImpactBurst(ctx, targetX, targetY - 18, damage, impactWindow, moveId);
  }

  drawImpactBurst(ctx, x, y, damage, amount, moveId) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(amount, amount);
    const color = damage > 0 ? "#ffcf47" : "#8fe1ff";
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(86,39,50,.65)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 20; i += 1) {
      const radius = i % 2 === 0 ? 96 : 45;
      const angle = -Math.PI / 2 + i * Math.PI / 10;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#43283c";
    ctx.textAlign = "center";
    ctx.font = "900 28px system-ui";
    const text = damage > 0 ? `${damage} DAMAGE!` : moveId === "duck" ? "DODGED!" : "BLOCKED!";
    ctx.fillText(text, 0, 10);
    ctx.restore();
  }

  drawForegroundDepth(ctx, state, now) {
    if (!this.backgroundImageReady) return;
    ctx.save();
    const sway = Math.sin(now / 900) * 4;
    const tufts = [120, 180, 265, 980, 1060, 1140];
    ctx.globalAlpha = 0.92;
    for (const x of tufts) {
      this.drawGrassClump(ctx, x + sway * (x % 2 ? 1 : -1), 635, 1 + (x % 3) * 0.12);
    }
    // Central foreground blades partially occlude the fighters' feet.
    this.drawGrassClump(ctx, 448, 650, 1.2);
    this.drawGrassClump(ctx, 830, 650, 1.2);
    ctx.restore();
  }

  drawGrassClump(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    for (let i = 0; i < 8; i += 1) {
      const lean = -0.5 + i * 0.14;
      const height = 26 + (i % 3) * 9;
      const grad = ctx.createLinearGradient(0, 0, 0, -height);
      grad.addColorStop(0, i % 2 ? "rgba(92,124,41,.95)" : "rgba(125,162,64,.92)");
      grad.addColorStop(1, "rgba(240,218,146,.82)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4 - i * 0.18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(i * 4 - 12, 0);
      ctx.quadraticCurveTo(i * 5 - 10, -height * 0.56, i * 8 - 18 + lean * 16, -height);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVignette(ctx) {
    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 250, WIDTH / 2, HEIGHT / 2, 780);
    vignette.addColorStop(0, "rgba(10,21,35,0)");
    vignette.addColorStop(1, "rgba(10,21,35,.24)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}


export function turkeyChoreography(progress = 0, mode = "replay") {
  const p = clamp(Number(progress) || 0, 0, 1);
  if (mode === "idle") {
    return {
      A: { x: 360, y: 588, scale: 1.12 },
      B: { x: 920, y: 588, scale: 1.12 }
    };
  }

  const approach = interval(p, 0.02, 0.16);
  const settle = interval(p, 0.84, 1);
  return {
    A: { x: lerp(360, 455, approach) - 20 * settle, y: 590, scale: 1.12 + 0.08 * approach },
    B: { x: lerp(920, 825, approach) + 20 * settle, y: 590, scale: 1.12 + 0.08 * approach }
  };
}

export function turkeyAttackTravel(moveId) {
  const move = turkeyMove(moveId);
  if (move.id === "charge") return 175;
  if (move.id === "peck") return 118;
  if (move.id === "wing-slap") return 100;
  return 0;
}

function roundRectPath(ctx, x, y, width, height, radius = 0) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.max(0, Math.min(Number(radius) || 0, Math.abs(width) / 2, Math.abs(height) / 2));
  const right = x + width;
  const bottom = y + height;
  ctx.moveTo(x + r, y);
  ctx.lineTo(right - r, y);
  ctx.quadraticCurveTo(right, y, right, y + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lerp(start, end, amount) {
  return start + (end - start) * clamp(amount, 0, 1);
}

function interval(value, start, end) {
  return easeInOut(clamp((value - start) / (end - start), 0, 1));
}

function pulse(value, start, end) {
  const p = clamp((value - start) / (end - start), 0, 1);
  return Math.sin(p * Math.PI);
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function easeOut(value) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function shade(hex, amount) {
  const clean = String(hex).replace("#", "");
  const number = Number.parseInt(clean, 16);
  if (!Number.isFinite(number)) return hex;
  const r = clampChannel((number >> 16) + amount);
  const g = clampChannel(((number >> 8) & 255) + amount);
  const b = clampChannel((number & 255) + amount);
  return `rgb(${r},${g},${b})`;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
