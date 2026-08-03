import test from "node:test";
import assert from "node:assert/strict";

function fakeContext() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "beginPath", "clearRect", "closePath", "ellipse", "fill", "fillRect", "fillText",
    "lineTo", "moveTo", "quadraticCurveTo", "restore", "rotate", "roundRect", "save", "scale",
    "setLineDash", "setTransform", "stroke", "strokeText", "translate"
  ]);
  return new Proxy({}, {
    get(target, key) {
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; }
  });
}

test("0.8 illustrated Turkey Fight scene renders idle, hit and blocked frames", async () => {
  globalThis.requestAnimationFrame = () => 0;
  const { TurkeyFightScene } = await import("../turkey-scene.mjs");
  const ctx = fakeContext();
  const canvas = { getContext: () => ctx, width: 0, height: 0 };
  const caption = { textContent: "", className: "" };
  const scene = new TurkeyFightScene(canvas, caption, { reducedMotion: true });

  assert.doesNotThrow(() => scene.setIdle({ actor: "A", preview: "wing-slap", active: true }));
  scene.mode = "replay";
  scene.replay = {
    gameType: "turkey", round: 1, moveA: "charge", moveB: "block", activeA: true, activeB: true,
    damageToA: 0, damageToB: 10, healthA: 100, healthB: 90, caption: "Exchange"
  };
  for (const progress of [0.2, 0.42, 0.72, 0.95]) {
    scene.progress = progress;
    assert.doesNotThrow(() => scene.draw(1000));
  }
});
