import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = () => readFile(new URL("sniper-scene.mjs", root), "utf8");

test("0.9C1 keeps the rendered world visible inside the scope lens", async () => {
  const text = await source();
  assert.doesNotMatch(text, /globalCompositeOperation\s*=\s*["']destination-out["']/);
  assert.match(text, /ctx\.fill\(["']evenodd["']\)/);
  assert.match(text, /previous destination-out\s*\n\s*\/\/ mask erased/i);
});

test("0.9C1 renders an explicit first-person firing sequence inside the lens", async () => {
  const text = await source();
  assert.match(text, /drawScopeShotFeedback/);
  assert.match(text, /TRIGGER LOCKED/);
  assert.match(text, /TAGGED/);
  assert.match(text, /MISS/);
  assert.match(text, /bulletX/);
  assert.match(text, /barrelX/);
});
