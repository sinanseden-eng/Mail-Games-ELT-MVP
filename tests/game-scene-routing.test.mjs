import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = path => readFile(new URL(path, root), "utf8");

test("0.8e1 hides the Turkey fallback in Penalty Shootout mode", async () => {
  const [css, turn, replay] = await Promise.all([
    text("turkey.css"),
    text("turn.js"),
    text("replay.js")
  ]);
  assert.match(css, /\.shootout-scene:not\(\.turkey-scene\) \.turkey-scene-fallback[\s\S]*display:\s*none !important/);
  for (const source of [turn, replay]) {
    assert.match(source, /turkeyFallback:\s*document\.getElementById\("turkey-scene-fallback"\)/);
    assert.match(source, /elements\.turkeyFallback\.hidden\s*=\s*!turkey/);
  }
});


test("0.9A routes the Sniper canvas and fallback only for Sniper Elite", async () => {
  const [css, turn, replay, turnHtml, replayHtml] = await Promise.all([
    text("sniper.css"),
    text("turn.js"),
    text("replay.js"),
    text("turn.html"),
    text("replay.html")
  ]);
  assert.match(css, /\.shootout-scene:not\(\.sniper-scene\) \.sniper-scene-fallback[\s\S]*display:\s*none !important/);
  for (const source of [turn, replay]) {
    assert.match(source, /sniperCanvas:\s*document\.getElementById\("sniper-canvas"\)/);
    assert.match(source, /elements\.sniperCanvas\.hidden\s*=\s*!sniper/);
    assert.match(source, /elements\.sniperFallback\.hidden\s*=\s*!sniper/);
  }
  assert.match(turnHtml, /id="sniper-canvas"/);
  assert.match(replayHtml, /id="sniper-canvas"/);
});
