// TANX — deterministic rules shared by offline play and the classroom server.
// Coordinates are pixels in a 640 × 400 arena; time is measured in seconds.
export const WIDTH = 640, HEIGHT = 400, STEP = 1 / 120;
export const COLOURS = ['#ff6479', '#66caff', '#a9ed78', '#ffdb71'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function random(seed) {
  let s = Number(seed) >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
export function settings(input = {}) {
  const choose = (key, values, fallback) => {
    const v = input[key] ?? fallback;
    if (!values.includes(v)) throw new Error(`Invalid Tanx ${key}.`);
    return v;
  };
  const integer = (key, lo, hi, fallback) => {
    const n = input[key] == null ? fallback : Number(input[key]);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`Tanx ${key} must be ${lo}–${hi}.`);
    return n;
  };
  const toggle = (key, fallback = true) => {
    if (input[key] != null && typeof input[key] !== 'boolean') throw new Error(`Invalid Tanx ${key}.`);
    return input[key] ?? fallback;
  };
  return {
    terrain: choose('terrain', ['gentle', 'rolling', 'mountains'], 'rolling'),
    windMode: choose('windMode', ['off', 'round', 'turn'], 'turn'),
    windStrength: integer('windStrength', 0, 35, 18),
    gravity: integer('gravity', 0, 150, 90),
    destructible: toggle('destructible'), falling: toggle('falling'),
    tankCollision: toggle('tankCollision'), terrainCollision: toggle('terrainCollision'),
    damage: toggle('damage'), fallDamage: toggle('fallDamage'),
    blastRadius: integer('blastRadius', 18, 60, 36),
    roundsToWin: integer('roundsToWin', 1, 5, 2),
    turnLimit: integer('turnLimit', 4, 80, 40),
    difficulty: choose('difficulty', ['rookie', 'veteran', 'elite'], 'veteran')
  };
}

// Terrain Engine: a binary pixel-alpha buffer, not a height-only collision map.
// Circular cuts can create overhangs. The browser paints the same cuts with
// destination-out; the server uses identical integer pixels without a canvas.
export class Terrain {
  constructor(seed, kind = 'rolling', count = 2, craters = []) {
    this.seed = seed; this.kind = kind; this.count = count;
    this.data = new Uint8Array(WIDTH * HEIGHT);
    this.craters = [];
    const rng = random(seed), p = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    const strength = {gentle: 13, rolling: 38, mountains: 70}[kind] ?? 38;
    this.heights = Array.from({length: WIDTH}, (_, x) => Math.round(clamp(
      255 + Math.sin(x / 101 + p[0]) * strength + Math.sin(x / 43 + p[1]) * strength * .42 + Math.sin(x / 19 + p[2]) * strength * .12,
      145, 333)));
    // A small level pad gives every tank a stable, unburied start.
    for (let i = 0; i < count; i++) {
      const x = spawnX(i, count), y = this.heights[x];
      for (let dx = -13; dx <= 13; dx++) this.heights[x + dx] = y;
    }
    for (let x = 0; x < WIDTH; x++) for (let y = this.heights[x]; y < HEIGHT; y++) this.data[y * WIDTH + x] = 255;
    for (const c of craters) this.carve(c.x, c.y, c.r);
  }
  solid(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && this.data[y * WIDTH + x] > 0;
  }
  carve(x, y, r) {
    const crater = {x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, r};
    x = crater.x; y = crater.y;
    this.craters.push(crater);
    for (let py = Math.max(0, Math.floor(y - r)); py <= Math.min(HEIGHT - 1, Math.ceil(y + r)); py++)
      for (let px = Math.max(0, Math.floor(x - r)); px <= Math.min(WIDTH - 1, Math.ceil(x + r)); px++)
        if ((px - crater.x) ** 2 + (py - crater.y) ** 2 <= r * r) this.data[py * WIDTH + px] = 0;
    return crater;
  }
  supported(tank, y = tank.y) {
    return [-5, 0, 5].some(dx => this.solid(tank.x + dx, y));
  }
}
export function spawnX(index, count) { return Math.round(65 + index * (WIDTH - 130) / (count - 1)); }
export function windAt(seed, turn, config) {
  if (config.windMode === 'off') return 0;
  const rng = random((seed ^ Math.imul(config.windMode === 'round' ? 1 : turn + 1, 2654435761)) >>> 0);
  return Math.round((rng() * 2 - 1) * config.windStrength);
}
export function createArena(seed, config, players) {
  const terrain = new Terrain(seed, config.terrain, players.length);
  const tanks = players.map((p, i) => ({name: String(p.name || `Player ${i + 1}`).slice(0, 24), type: p.type === 'cpu' ? 'cpu' : 'human', colour: COLOURS[i], x: spawnX(i, players.length), y: terrain.heights[spawnX(i, players.length)], hp: 100, angle: i < players.length / 2 ? 45 : 135, power: 60}));
  return {seed: seed >>> 0, tanks, craters: [], active: 0, turn: 0, wind: windAt(seed, 0, config)};
}

// Physics / Projectiles: fixed-step integration, swept one-pixel collision.
export function launch(tank, angle, power) {
  const a = angle * Math.PI / 180, v = power * 3.1;
  return {x: tank.x + Math.cos(a) * 15, y: tank.y - 10 - Math.sin(a) * 15,
    vx: Math.cos(a) * v, vy: -Math.sin(a) * v, age: 0};
}
export function stepProjectile(p, terrain, tanks, shooter, wind, config, dt = STEP) {
  const ox = p.x, oy = p.y;
  p.vx += wind * dt; p.vy += config.gravity * dt;
  const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
  const steps = Math.max(1, Math.ceil(Math.hypot(nx - ox, ny - oy)));
  p.age += dt;
  for (let n = 1; n <= steps; n++) {
    p.x = ox + (nx - ox) * n / steps; p.y = oy + (ny - oy) * n / steps;
    if (p.x < 0 || p.x >= WIDTH || p.y >= HEIGHT || p.age > 16 || p.y < -2500) return {kind: 'miss', x: p.x, y: p.y};
    if (config.tankCollision) for (let i = 0; i < tanks.length; i++) {
      const t = tanks[i];
      if (t.hp > 0 && (i !== shooter || p.age > .15) && Math.abs(p.x - t.x) <= 8 && p.y >= t.y - 14 && p.y <= t.y)
        return {kind: 'tank', tank: i, x: p.x, y: p.y};
    }
    if (config.terrainCollision && terrain.solid(p.x, p.y)) return {kind: 'terrain', x: p.x, y: p.y};
  }
  return null;
}
export function traceShot(arena, angle, power, config, target = null, sharedTerrain = null) {
  const terrain = sharedTerrain || new Terrain(arena.seed, config.terrain, arena.tanks.length, arena.craters);
  const p = launch(arena.tanks[arena.active], angle, power), path = [[p.x, p.y, 0]];
  let hit, closest = Infinity, ticks = 0;
  while (!hit) {
    hit = stepProjectile(p, terrain, arena.tanks, arena.active, arena.wind, config);
    if (target) closest = Math.min(closest, Math.hypot(p.x - target.x, p.y - target.y + 7));
    if ((++ticks % 4 === 0 || hit) && !target) path.push([+p.x.toFixed(2), +p.y.toFixed(2), +p.age.toFixed(4)]);
  }
  return {path, hit, duration: p.age, closest, terrain};
}
export function settleTanks(terrain, tanks, config) {
  const falls = [];
  if (!config.falling) return falls;
  for (let i = 0; i < tanks.length; i++) {
    const t = tanks[i]; if (t.hp <= 0) continue;
    const from = t.y; let y = from;
    while (y < HEIGHT + 12 && !terrain.supported(t, y)) y++;
    t.y = y;
    if (y >= HEIGHT) t.hp = 0;
    else if (config.damage && config.fallDamage) t.hp = Math.max(0, t.hp - Math.max(0, Math.round((y - from - 13) * .65)));
    if (y !== from) falls.push({tank: i, from, to: y});
  }
  return falls;
}
export function resolveShot(arena, angle, power, config, enabled = true) {
  if (!Number.isInteger(angle) || angle < 0 || angle > 180 || !Number.isInteger(power) || power < 0 || power > 100) throw new Error('Choose an angle of 0–180° and power of 0–100%.');
  const before = structuredClone(arena), after = structuredClone(arena);
  const shooter = after.active;
  after.tanks[shooter].angle = angle; after.tanks[shooter].power = power;
  const trace = enabled ? traceShot(after, angle, power, config) : {path: [], hit: null, duration: .8, terrain: new Terrain(after.seed, config.terrain, after.tanks.length, after.craters)};
  const {hit, terrain} = trace, damage = Array(after.tanks.length).fill(0);
  let crater = null;
  if (hit && hit.kind !== 'miss') {
    if (config.damage) after.tanks.forEach((tank, i) => {
      if (tank.hp <= 0) return;
      const distance = Math.max(0, Math.hypot(tank.x - hit.x, tank.y - 7 - hit.y) - 5);
      const amount = hit.tank === i ? 90 : Math.round(75 * Math.max(0, 1 - distance / config.blastRadius) ** .75);
      damage[i] = Math.min(tank.hp, amount); tank.hp -= damage[i];
    });
    if (config.destructible) {crater = terrain.carve(hit.x, hit.y, config.blastRadius); after.craters.push(crater);}
  }
  const falls = settleTanks(terrain, after.tanks, config);
  after.turn++;
  const living = after.tanks.map((t, i) => t.hp > 0 ? i : -1).filter(i => i >= 0);
  const limited = after.turn >= config.turnLimit * after.tanks.length;
  const over = living.length <= 1 || limited;
  let winner = living.length === 1 ? living[0] : null;
  if (limited && living.length > 1) {
    const best = Math.max(...after.tanks.map(t => t.hp)), leaders = living.filter(i => after.tanks[i].hp === best);
    winner = leaders.length === 1 ? leaders[0] : null;
  }
  if (living.length) for (let n = 1; n <= after.tanks.length; n++) {
    const i = (shooter + n) % after.tanks.length;
    if (after.tanks[i].hp > 0) {after.active = i; break;}
  }
  after.wind = windAt(after.seed, after.turn, config);
  return {before, after, shooter, angle, power, enabled, path: trace.path,
    hit, duration: trace.duration, damage, crater, falls, over, winner, limited};
}

// AI Controller: score trajectories using the actual wind and terrain, then add
// deliberate difficulty-dependent error. It never sees a human's future shot.
export function planAI(arena, config, rng = Math.random) {
  const tank = arena.tanks[arena.active];
  const rivals = arena.tanks.map((t, i) => ({...t, i})).filter(t => t.hp > 0 && t.i !== arena.active);
  const target = rivals.sort((a, b) => Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x))[0];
  if (!target) return {angle: 90, power: 0};
  let best = {score: Infinity, angle: target.x > tank.x ? 45 : 135, power: 60};
  const terrain = new Terrain(arena.seed, config.terrain, arena.tanks.length, arena.craters);
  // Coarse grid followed by a local search handles hills and headwinds.
  for (let a = 18; a <= 162; a += 9) for (let p = 20; p <= 100; p += 8) {
    const shot = traceShot(arena, a, p, config, target, terrain);
    let score = shot.closest + (shot.hit.tank === arena.active ? 400 : 0);
    if (shot.hit.tank === target.i) score -= 30;
    if (score < best.score) best = {score, angle: a, power: p};
  }
  const coarse = {...best};
  for (let a = coarse.angle - 8; a <= coarse.angle + 8; a += 2)
    for (let p = Math.max(1, coarse.power - 8); p <= Math.min(100, coarse.power + 8); p += 2) {
      const shot = traceShot(arena, a, p, config, target, terrain);
      const score = shot.closest + (shot.hit.tank === arena.active ? 400 : 0) - (shot.hit.tank === target.i ? 30 : 0);
      if (score < best.score) best = {score, angle: a, power: p};
    }
  const error = {rookie: .15, veteran: .05, elite: .01}[config.difficulty];
  return {angle: Math.round(clamp(best.angle + (rng() * 2 - 1) * 90 * error, 0, 180)), power: Math.round(clamp(best.power * (1 + (rng() * 2 - 1) * error), 0, 100))};
}

// Match Engine: round scores and serializable deterministic classroom state.
export function newMatch(config, players, seed = Date.now() >>> 0) {
  return {config: settings(config), players, seed, round: 1, wins: players.map(() => 0), arena: createArena(seed, settings(config), players), finished: false, winner: null};
}
export function playMatch(match, angle, power, enabled = true) {
  if (match.finished) throw new Error('This Tanx match has ended.');
  const next = structuredClone(match), replay = resolveShot(next.arena, angle, power, next.config, enabled);
  next.arena = replay.after;
  if (replay.over) {
    if (replay.winner !== null) next.wins[replay.winner]++;
    if (next.wins.some(n => n >= next.config.roundsToWin)) {next.finished = true; next.winner = replay.winner;}
  }
  return {match: next, replay};
}
export function nextRound(match) {
  const next = structuredClone(match);
  next.round++;
  next.arena = createArena((next.seed + Math.imul(next.round - 1, 1013904223)) >>> 0, next.config, next.players);
  // Alternate the opening tank each round, including with four players.
  next.arena.active = (next.round - 1) % next.players.length;
  return next;
}

// Terrain buffer painting. Pixel opacity is identical to the simulation mask.
export function paintTerrain(canvas, terrain) {
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(WIDTH, HEIGHT);
  const earth = [[95, 61, 56], [107, 72, 57], [121, 83, 59], [83, 58, 60]];
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    if (y < terrain.heights[x]) continue;
    const i = (y * WIDTH + x) * 4, top = y - terrain.heights[x];
    const rgb = top < 2 ? [183, 228, 103] : top < 5 ? [84, 137, 76] : earth[Math.floor((y + Math.sin(x / 25) * 3) / 12) % 4];
    const grain = ((x * 17 + y * 31) % 13 === 0) ? 13 : 0;
    image.data[i] = rgb[0] + grain; image.data[i + 1] = rgb[1] + grain; image.data[i + 2] = rgb[2] + grain; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  // Erase integer runs so the painted alpha and server collision pixels match.
  // Each erased run is part of a circular crater; no flattened heightmap cuts.
  for (const {x, y, r} of terrain.craters) {
    for (let py = Math.max(0, Math.floor(y - r)); py <= Math.min(HEIGHT - 1, Math.ceil(y + r)); py++) {
      if ((py - y) ** 2 > r * r) continue;
      const half = Math.sqrt(Math.max(0, r * r - (py - y) ** 2));
      const left = Math.max(0, Math.ceil(x - half)), right = Math.min(WIDTH - 1, Math.floor(x + half));
      if (right >= left) ctx.fillRect(left, py, right - left + 1, 1);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Canvas renderer; graphics are original code-drawn pixels, with no assets.
export class Renderer {
  constructor(canvas, spriteUrls = []) {
    this.canvas = canvas; canvas.width = WIDTH; canvas.height = HEIGHT; this.ctx = canvas.getContext('2d'); this.buffer = document.createElement('canvas'); this.key = '';
    this.sprites = spriteUrls.map(url => {const image = new Image(); image.src = url; return image;});
  }
  draw(arena, config, {time = 0, shot = null, progress = 0, aim = null, round = 1, wins = []} = {}) {
    const c = this.ctx; c.imageSmoothingEnabled = false;
    const key = `${arena.seed}:${arena.craters.length}:${config.terrain}`;
    if (key !== this.key) {paintTerrain(this.buffer, new Terrain(arena.seed, config.terrain, arena.tanks.length, arena.craters)); this.key = key;}
    for (let y = 0; y < HEIGHT; y += 4) {const t = y / HEIGHT; c.fillStyle = `rgb(${Math.round(14 + t * 32)},${Math.round(26 + t * 79)},${Math.round(59 + t * 72)})`; c.fillRect(0, y, WIDTH, 4);}
    // Distant copper mountains and stars stay fixed; the land does the moving.
    for (let i = 0; i < 48; i++) {c.fillStyle = i % 3 ? '#8eaeb9' : '#c7d5bb'; c.fillRect((i * 131 + 31) % WIDTH, 45 + (i * 43) % 100, 1, 1);}
    c.fillStyle = '#314d69'; c.beginPath(); c.moveTo(0, HEIGHT);
    for (let x = 0; x <= WIDTH; x += 8) c.lineTo(x, 230 + Math.sin(x / 91) * 30 + Math.sin(x / 36) * 14);
    c.lineTo(WIDTH, HEIGHT); c.fill();
    c.drawImage(this.buffer, 0, 0);
    const tanks = arena.tanks.map(t => ({...t}));
    if (shot && progress >= shot.duration && shot.falls.length) for (const fall of shot.falls) {
      const t = clamp((progress - shot.duration - .2) / .65, 0, 1);
      tanks[fall.tank].y = fall.from + (fall.to - fall.from) * t * t;
    }
    tanks.forEach((t, i) => {
      if (t.hp <= 0 && !(shot && progress < shot.duration + .8 && shot.before.tanks[i].hp > 0)) return;
      const a = (aim && i === arena.active ? aim.angle : t.angle) * Math.PI / 180;
      c.fillStyle = '#172333'; c.fillRect(Math.round(t.x - 9), Math.round(t.y - 4), 18, 5);
      c.fillStyle = t.colour; c.fillRect(Math.round(t.x - 7), Math.round(t.y - 8), 14, 5); c.fillRect(Math.round(t.x - 4), Math.round(t.y - 11), 8, 4);
      const sprite = this.sprites[i % this.sprites.length];
      if (sprite?.complete && sprite.naturalWidth) {
        c.save(); c.translate(Math.round(t.x), Math.round(t.y));
        if (Math.cos(a) > 0) c.scale(-1, 1);
        c.drawImage(sprite, -13, -16, 26, 16); c.restore();
      }
      c.strokeStyle = t.colour; c.lineWidth = 3; c.beginPath(); c.moveTo(t.x, t.y - 10); c.lineTo(t.x + Math.cos(a) * 14, t.y - 10 - Math.sin(a) * 14); c.stroke();
      c.fillStyle = '#b4cbba'; for (let w = -5; w <= 5; w += 5) c.fillRect(Math.round(t.x + w), Math.round(t.y - 2), 2, 1);
      if (i === arena.active && !shot) {c.fillStyle = '#f7efad'; c.fillRect(t.x - 2, t.y - 29 + Math.round(Math.sin(time * 4)), 5, 3); c.fillRect(t.x - 1, t.y - 26 + Math.round(Math.sin(time * 4)), 3, 2);}
      c.fillStyle = '#102632'; c.fillRect(t.x - 13, t.y + 7, 26, 3); c.fillStyle = t.colour; c.fillRect(t.x - 13, t.y + 7, Math.round(t.hp * .26), 3);
    });
    if (shot?.path.length) {
      const trail = shot.path.filter(p => p[2] <= Math.min(progress, shot.duration));
      if (trail.length) {
        c.lineWidth = 1; c.strokeStyle = '#f3dc9690'; c.beginPath(); trail.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
        const tip = trail.at(-1); if (progress < shot.duration) {c.fillStyle = '#fff9d4'; c.fillRect(Math.round(tip[0] - 1), Math.round(tip[1] - 1), 3, 3);}
      }
      if (progress >= shot.duration && shot.hit?.kind !== 'miss') {
        const age = progress - shot.duration, rng = random(shot.before.seed + shot.before.turn * 17);
        if (age < .5) for (let i = 3; i > 0; i--) {c.fillStyle = ['#fff4c0', '#ffd76a', '#ef7546'][i - 1]; c.beginPath(); c.arc(shot.hit.x, shot.hit.y, Math.max(0, config.blastRadius * (1 - age / .5) * i / 3), 0, Math.PI * 2); c.fill();}
        if (age < 1.4) for (let i = 0; i < 35; i++) {const a = rng() * Math.PI * 2, v = 12 + rng() * 90; c.fillStyle = i % 3 ? '#e2ac67' : '#fff0a0'; c.fillRect(Math.round(shot.hit.x + Math.cos(a) * v * age), Math.round(shot.hit.y + Math.sin(a) * v * age + 65 * age * age), 2, 2);}
      }
    }
    c.fillStyle = '#0b1429d9'; c.fillRect(0, 0, WIDTH, 32);
    c.font = 'bold 10px monospace'; c.textBaseline = 'middle';
    c.fillStyle = '#f1e4bd'; c.fillText(`ROUND ${round}  /  TURN ${arena.turn + 1}`, 12, 16);
    const wind = arena.wind, arrow = wind < 0 ? '<' : wind > 0 ? '>' : '-';
    c.fillStyle = '#a9cddd'; c.fillText(`WIND ${arrow} ${Math.abs(wind)}  ${config.windMode === 'off' ? 'OFF' : 'PX/S²'}`, 260, 16);
    c.fillStyle = '#e6d4a5'; c.fillText(wins.map((w, i) => `${i + 1}:${w}`).join('  '), 505, 16);
  }
}
