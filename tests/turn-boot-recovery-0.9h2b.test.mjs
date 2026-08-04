import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const turn = readFileSync(new URL("../turn.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../turn.html", import.meta.url), "utf8");

test("0.9H2B version-busts the secure turn module", () => {
  assert.match(html, /(?:turn\.js\?v=0\.9\.23|turn-0\.9h4b\.js|turn-0\.9h4c\.js|turn-0\.9h4d\.js|turn-0\.9h5\.js)/);
  assert.match(turn, /shootout-scene\.mjs\?v=0\.9\.23/);
});

test("0.9H2B aborts a stalled get-turn request", () => {
  assert.match(turn, /new AbortController\(\)/);
  assert.match(turn, /controller\.abort\(\)/);
  assert.match(turn, /cache: "no-store"/);
});

test("0.9H2B exposes retry instead of an endless loading screen", () => {
  assert.match(html, /The turn page stalled/);
  assert.match(turn, /Reload turn/);
  assert.match(turn, /request-timeout/);
});
