import test from "node:test";
import assert from "node:assert/strict";

function fakeContext() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "arcTo", "beginPath", "clearRect", "closePath", "ellipse", "fill", "fillRect",
    "fillText", "lineTo", "moveTo", "quadraticCurveTo", "restore", "rotate", "roundRect",
    "save", "scale", "setLineDash", "stroke", "strokeText", "translate"
  ]);
  return new Proxy({}, {
    get(target, key) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

test("0.7.2 shared 2.5D scene renders goal save and miss frames without runtime errors", async () => {
  globalThis.location = { search: "?snapshot" };
  globalThis.window = { addEventListener() {} };
  globalThis.requestAnimationFrame = () => 0;

  const { ShootoutScene } = await import("../shootout-scene.mjs");
  const ctx = fakeContext();
  const canvas = { getContext: () => ctx };
  const caption = { textContent: "", className: "" };
  const scene = new ShootoutScene(canvas, caption, { reducedMotion: true });

  const samples = [
    { outcome: "goal", shotZone: "top-right", keeperZone: "bottom-left", shotActive: true, keeperActive: true, progress: 0.66, impacted: true },
    { outcome: "save", shotZone: "bottom-left", keeperZone: "bottom-left", shotActive: true, keeperActive: true, progress: 0.72, impacted: true },
    { outcome: "miss", shotZone: "bottom-centre", keeperZone: "top-left", shotActive: false, keeperActive: true, progress: 0.76, impacted: true }
  ];

  for (const replay of samples) {
    scene.replay = { kickIndex: 1, reason: "smoke", caption: replay.outcome, ...replay };
    assert.doesNotThrow(() => scene.draw(1000));
  }
});

test("0.9E1 full-motion kick and goal frames render without stopping before contact", async () => {
  globalThis.location = { search: "?snapshot" };
  globalThis.window = { addEventListener() {} };
  globalThis.requestAnimationFrame = () => 0;

  const { ShootoutScene } = await import("../shootout-scene.mjs");
  const ctx = fakeContext();
  const canvas = { getContext: () => ctx };
  const caption = { textContent: "", className: "" };
  const scene = new ShootoutScene(canvas, caption, { reducedMotion: false });

  for (const progress of [0.18, 0.235, 0.27, 0.60, 0.68]) {
    scene.replay = {
      kickIndex: 1,
      outcome: "goal",
      shotZone: "top-right",
      keeperZone: "bottom-left",
      shotActive: true,
      keeperActive: true,
      reason: "goal",
      caption: "Goal",
      progress,
      impacted: progress >= 0.60
    };
    assert.doesNotThrow(() => scene.draw(1000));
  }
});
