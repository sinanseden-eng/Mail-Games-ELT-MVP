import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('0.8a pins the Turkey canvas to the arena and provides a visible fallback', async () => {
  const [css, turnHtml, replayHtml] = await Promise.all([
    text('turkey.css'),
    text('turn.html'),
    text('replay.html')
  ]);
  assert.match(css, /#turkey-canvas\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;/);
  assert.match(css, /\.turkey-scene-fallback/);
  assert.match(css, /\.turkey-scene\.render-ready \.turkey-scene-fallback/);
  assert.match(turnHtml, /id="turkey-scene-fallback"/);
  assert.match(replayHtml, /id="turkey-scene-fallback"/);
});

test('0.8a redraws after reveal and keeps a roundRect compatibility path', async () => {
  const scene = await text('turkey-scene.mjs');
  assert.match(scene, /drawSafely/);
  assert.match(scene, /raf\(\(\) => this\.drawSafely/);
  assert.match(scene, /function roundRectPath/);
  assert.match(scene, /classList\.add\("render-ready"\)/);
});
