import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = path => readFile(new URL(path, root), "utf8");

test("0.9A Teacher Studio and local demo expose Sniper Elite", async () => {
  const [html, app] = await Promise.all([text("index.html"), text("app.js")]);
  assert.match(html, /option value="sniper"/);
  assert.match(html, /data-play-game="sniper"/);
  assert.match(html, /id="sniper-demo-template"/);
  assert.match(app, /renderSniperGame/);
  assert.match(app, /emergenceA/);
  assert.match(app, /targetA/);
});

test("0.9A packages the realistic mountain-village arena and database migration", async () => {
  const asset = new URL("../assets/sniper-village-background.png", import.meta.url);
  await access(asset);
  assert.ok((await stat(asset)).size > 100_000);
  const migration = await text("supabase/migrations/007_sniper_game.sql");
  assert.match(migration, /'penalty', 'turkey', 'sniper'/);
});
