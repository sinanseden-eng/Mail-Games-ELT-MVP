import test from "node:test";
import assert from "node:assert/strict";

function fakeContext() {
  const gradient = { addColorStop() {} };
  const methods = new Set([
    "arc", "beginPath", "clearRect", "clip", "closePath", "drawImage", "fill", "fillRect", "fillText",
    "lineTo", "moveTo", "quadraticCurveTo", "restore", "rotate", "roundRect", "save", "scale",
    "setLineDash", "stroke", "translate"
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

test("0.9B Sniper Elite scene renders cinematic shot and resolved frames", async () => {
  globalThis.requestAnimationFrame = () => 0;
  const { SniperScene, SNIPER_REPLAY_TIMELINE } = await import("../sniper-scene.mjs");
  assert.ok(SNIPER_REPLAY_TIMELINE.shotAStart < SNIPER_REPLAY_TIMELINE.shotAImpact);
  assert.ok(SNIPER_REPLAY_TIMELINE.shotBStart < SNIPER_REPLAY_TIMELINE.shotBImpact);
  const ctx = fakeContext();
  const canvas = { getContext: () => ctx, width: 0, height: 0, style: {}, closest: () => null };
  const caption = { textContent: "", className: "" };
  const scene = new SniperScene(canvas, caption, { reducedMotion: true });
  assert.doesNotThrow(() => scene.setIdle({ actor: "A", emergence: "rooftop", target: "broken-wall", active: true }));
  scene.mode = "replay";
  scene.replay = {
    gameType: "sniper",
    round: 1,
    emergenceA: "rooftop",
    targetA: "broken-wall",
    emergenceB: "broken-wall",
    targetB: "supply-crates",
    activeA: true,
    activeB: true,
    hitByA: true,
    hitByB: false,
    healthA: 3,
    healthB: 2,
    caption: "PLAYER A TAGS THE RIVAL POSITION."
  };
  for (const progress of [0.2, 0.48, 0.59, 0.64, 0.72, 0.95]) {
    scene.progress = progress;
    assert.doesNotThrow(() => scene.draw(1000));
  }
});
