import { ShootoutScene as CanvasScene } from "./football-scene.mjs";

// Keep the existing replay clock, controls, accessibility and fallback. The 3D
// download is lazy and cannot delay answering, submitting, or scoring a turn.
export class ShootoutScene extends CanvasScene {
  constructor(canvas, caption, options = {}) {
    super(canvas, caption, options);
    this.ready = this.loadPlayers().finally(() => { this.playersReady = true; });
  }
  playReplay(round) {
    this.cancelReplay();
    if (this.destroyed) return Promise.resolve({ cancelled: true });
    this.setCaption('Getting the players ready…');
    return new Promise(resolve => {
      const pending = { resolve, round };
      this.pendingReplay = pending;
      const start = () => {
        if (this.destroyed || this.pendingReplay !== pending) return;
        // Compile/render the starting pose before starting the replay clock.
        // A cold model download must not consume the run-up and ball flight.
        try { this.view?.render(round, 0, { reducedMotion: this.reducedMotion, sag: this.sag }); }
        catch { this.fallback(); }
        this.pendingReplay = null;
        super.playReplay(round).then(resolve);
      };
      if (this.playersReady) start();
      else Promise.resolve(this.ready).catch(() => false).then(start);
    });
  }
  cancelReplay() {
    if (this.pendingReplay) {
      const pending = this.pendingReplay;
      this.pendingReplay = null;
      pending.resolve({ cancelled: true });
    }
    super.cancelReplay();
  }
  skipReplay() {
    if (this.pendingReplay) {
      const { round, resolve } = this.pendingReplay;
      this.pendingReplay = null;
      super.playReplay(round).then(resolve);
    }
    super.skipReplay();
  }
  async loadPlayers() {
    if (
      !this.canvas.ownerDocument ||
      new URLSearchParams(location.search).has("football2d")
    )
      return false;
    let view;
    try {
      const { FootballView } = await import("./vendor/football-three.mjs");
      if (this.destroyed) return false;
      view = new FootballView(this.canvas, () => this.fallback());
      this.pendingView = view;
      await view.ready;
      if (this.destroyed || view.destroyed) {
        view.destroy();
        return false;
      }
      this.pendingView = null;
      this.view = view;
      this.canvas.dataset.renderer = "3d";
      this.canvas.setAttribute(
        "aria-label",
        "TV sideline view: animated football players, a deep goal net and a reactive sagging net",
      );
      this.layoutZoneButtons();
      this.draw(0);
      return true;
    } catch {
      view?.destroy();
      this.pendingView = null;
      this.canvas.dataset.renderer = "2d";
      return false;
    }
  }
  fallback() {
    this.view?.destroy();
    this.pendingView?.destroy();
    this.view = null;
    this.pendingView = null;
    if (this.canvas.dataset) this.canvas.dataset.renderer = "2d";
  }
  layoutZoneButtons() {
    if (!this.view) return super.layoutZoneButtons();
    for (const button of this.overlay?.querySelectorAll("[data-zone]") || []) {
      const p = this.view.projectZone(button.dataset.zone);
      button.style.left = `${(p.x / 1280) * 100}%`;
      button.style.top = `${(p.y / 720) * 100}%`;
    }
  }
  targetAtScreen(x, y) {
    return this.view?.targetAtScreen(x, y);
  }
  draw(clock = 0) {
    if (!this.view) return super.draw(clock);
    const round = this.replay?.data || this.resultStill;
    const time = this.replay?.elapsed ?? (this.resultStill ? 4.2 : 0);
    try {
      this.view.render(round, time, {
        reducedMotion: this.reducedMotion,
        sag: this.sag,
        preview: this.preview,
        guide: this.showTargetGuide,
      });
    } catch {
      this.fallback();
      super.draw(clock);
    }
  }
  renderAt(round, seconds) {
    if (this.view) this.view.render(round, seconds, { sag: this.sag });
    else super.renderAt(round, seconds);
  }
  destroy() {
    super.destroy();
    this.fallback();
  }
}
