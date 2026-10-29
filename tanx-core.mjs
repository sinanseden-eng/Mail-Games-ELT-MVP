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
  const earth = [[86, 80, 63], [100, 88, 65], [72, 76, 66], [113, 95, 70]];
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    if (y < terrain.heights[x]) continue;
    const i = (y * WIDTH + x) * 4, top = y - terrain.heights[x];
    const ridge = Math.sin(x / 43) * 7 + Math.sin(x / 13) * 2;
    const rgb = top < 2 ? [204, 207, 139] : top < 5 ? [129, 153, 92] : top < 10 ? [105, 115, 74] : earth[Math.floor((y + ridge) / 19) % 4];
    const grain = (((Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ terrain.seed) >>> 8) % 23) - 11;
    const stone = ((Math.imul(Math.floor(x / 3), 727) ^ Math.imul(Math.floor(y / 2), 977)) >>> 0) % 47 === 0 ? 17 : 0;
    const shade = Math.max(.72, 1 - top / 620);
    image.data[i] = (rgb[0] + grain + stone) * shade;
    image.data[i + 1] = (rgb[1] + grain + stone) * shade;
    image.data[i + 2] = (rgb[2] + grain + stone) * shade; image.data[i + 3] = 255;
  }
  // Burnt soil and a small sunlit lip give circular cuts visual depth. Alpha
  // stays untouched here; the exact collision mask is still cut below.
  for (const {x,y,r} of terrain.craters) {
    for (let py=Math.max(0,Math.floor(y-r-6));py<=Math.min(HEIGHT-1,Math.ceil(y+r+6));py++)
      for (let px=Math.max(0,Math.floor(x-r-6));px<=Math.min(WIDTH-1,Math.ceil(x+r+6));px++) {
        if (!terrain.solid(px,py)) continue;
        const distance=Math.hypot(px-x,py-y),rim=distance-r;
        if(rim<0 || rim>6)continue;
        const i=(py*WIDTH+px)*4,shade=.48+.52*rim/6;
        for(let channel=0;channel<3;channel++)image.data[i+channel]*=shade;
        if(rim<1.6 && py<y && px<x) {image.data[i]+=27;image.data[i+1]+=22;image.data[i+2]+=12;}
      }
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

// The deluxe renderer stays separate from the deterministic rules above.
// It draws at 2× resolution, while collision and trajectories stay in arena pixels.
export function replayTip(path, time) {
  if (!path.length) return null;
  if (time <= path[0][2]) return {x:path[0][0],y:path[0][1],index:0};
  let lo=0,hi=path.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(path[mid][2]<=time)lo=mid;else hi=mid-1;}
  const a=path[lo],b=path[Math.min(lo+1,path.length-1)];
  const u=b[2]>a[2]?clamp((time-a[2])/(b[2]-a[2]),0,1):0;
  return {x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,index:lo};
}
function ellipse(c,x,y,rx,ry,colour){c.fillStyle=colour;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fill();}
function label(c,text,x,y,colour='#fff2d2',size=7,align='center'){
  c.font=`bold ${size}px ui-monospace,monospace`;c.textAlign=align;c.textBaseline='middle';
  c.fillStyle='#0c202bd9';c.fillText(text,x+.5,y+1);c.fillStyle=colour;c.fillText(text,x,y);
}
function skyLandscape(canvas,seed){
  canvas.width=WIDTH*2;canvas.height=HEIGHT*2;const c=canvas.getContext('2d');c.scale(2,2);
  const rng=random(seed^0xb4d35),sky=c.createLinearGradient(0,0,0,HEIGHT);
  sky.addColorStop(0,'#142740');sky.addColorStop(.34,'#526779');sky.addColorStop(.61,'#d5a58a');sky.addColorStop(1,'#e5c79d');c.fillStyle=sky;c.fillRect(0,0,WIDTH,HEIGHT);
  const sunX=440+rng()*100,sunY=105+rng()*30;
  const glow=c.createRadialGradient(sunX,sunY,6,sunX,sunY,135);glow.addColorStop(0,'#ffe8bb9c');glow.addColorStop(.35,'#ffd4a335');glow.addColorStop(1,'#ffd4a300');c.fillStyle=glow;c.fillRect(0,25,WIDTH,240);
  ellipse(c,sunX,sunY,24,24,'#f9dec1');
  // Soft horizontal cloud banks retain the copper-sky rhythm of the original.
  for(let i=0;i<21;i++){
    const x=rng()*WIDTH,y=40+rng()*100,w=18+rng()*80;
    c.fillStyle=i%3===0?'#ffc7a330':'#9aaca52b';c.beginPath();c.moveTo(x-w,y+4);
    c.bezierCurveTo(x-w*.7,y-4,x-w*.4,y-3,x-w*.2,y-2);c.bezierCurveTo(x-w*.1,y-10,x+w*.3,y-8,x+w*.4,y-2);c.bezierCurveTo(x+w*.7,y-5,x+w,y,x+w*1.2,y+4);c.closePath();c.fill();
  }
  for(let layer=0;layer<4;layer++){
    const base=153+layer*29,amplitude=layer===0?47:22-layer*2,phase=rng()*6;
    const ridge=[];for(let x=-4;x<=WIDTH+4;x+=4)ridge.push([x,base+Math.sin(x/(79-layer*9)+phase)*amplitude+Math.sin(x/27+phase*2)*amplitude*.28]);
    c.fillStyle=['#898e97','#6d838b','#486d75','#2c515c'][layer];c.beginPath();c.moveTo(-5,HEIGHT);for(const p of ridge)c.lineTo(...p);c.lineTo(WIDTH+5,HEIGHT);c.fill();
    if(layer===0){
      c.fillStyle='#e0d1bbaa';let cap=[];
      const snow=()=>{if(cap.length<2){cap=[];return;}c.beginPath();cap.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));for(let i=cap.length-1;i>=0;i--){const [x,y]=cap[i],edge=Math.sin(i/Math.max(1,cap.length-1)*Math.PI);c.lineTo(x,y+edge*(8+Math.sin(x*.095)*3+Math.cos(x*.037)*4));}c.closePath();c.fill();cap=[];};
      for(const point of ridge){if(point[1]<126)cap.push(point);else snow();}snow();
    }
    if(layer>=2){
      c.fillStyle=layer===2?'#365e65':'#254b54';
      for(let x=0;x<WIDTH;x+=5+rng()*6){const y=base+Math.sin(x/(79-layer*9)+phase)*amplitude+Math.sin(x/27+phase*2)*amplitude*.28,h=3+rng()*11;
        c.beginPath();c.moveTo(x,y-h);c.lineTo(x-3,y+2);c.lineTo(x+3,y+2);c.closePath();c.fill();}
    }
    const haze=c.createLinearGradient(0,base-25,0,base+36);haze.addColorStop(0,'#e8c6a600');haze.addColorStop(.6,'#e8c6a61a');haze.addColorStop(1,'#e8c6a600');c.fillStyle=haze;c.fillRect(0,base-25,WIDTH,61);
  }
  // A few silhouettes give scale without disguising playable terrain.
  c.strokeStyle='#273f50a0';c.lineWidth=.65;
  for(let i=0;i<5;i++){const x=80+rng()*300,y=59+rng()*43;c.beginPath();c.moveTo(x-3,y+1);c.quadraticCurveTo(x-1,y-1,x,y);c.quadraticCurveTo(x+1,y-1,x+3,y+1);c.stroke();}
}
function dressTerrain(canvas,terrain){
  const c=canvas.getContext('2d'),rng=random(terrain.seed^77321);c.imageSmoothingEnabled=false;
  for(let x=2;x<WIDTH-2;x+=2){
    const y=terrain.heights[x];if(!terrain.solid(x,y))continue;
    const h=1+rng()*3;
    c.strokeStyle=x%4?'#a6bd73':'#d6d398';c.lineWidth=.6;c.beginPath();c.moveTo(x,y+.5);c.lineTo(x-1,y-h);c.moveTo(x,y);c.lineTo(x+1,y-h*.7);c.stroke();
    if(rng()>.93){c.fillStyle='#7e8c75';c.fillRect(x,y-1,2,1);}
  }
}
function smoke(c,x,y,age,seed,scale=1){
  const rng=random(seed);for(let i=0;i<9;i++){
    const drift=(rng()-.5)*12,r=3+rng()*5,a=(age+i*.19)%2.3;
    const opacity=(1-a/2.3)*.2;
    ellipse(c,x+drift*a,y-a*15*scale,r*(.5+a*.5)*scale,r*(.6+a*.7)*scale,`rgba(29,39,44,${opacity})`);
  }
}
function drawBlast(c,impact,time,reduced){
  if(!impact)return;const age=time-impact.at;if(age<0||age>3.2)return;
  const rng=random(impact.seed),r=impact.radius,x=impact.x,y=impact.y;
  if(age<.65){
    const glow=c.createRadialGradient(x,y,0,x,y,r*(1.2+age));glow.addColorStop(0,`rgba(255,222,135,${.42*(1-age/.65)})`);glow.addColorStop(1,'#ef8f4200');c.fillStyle=glow;c.fillRect(x-r*2,y-r*2,r*4,r*4);
    if(!reduced){c.strokeStyle=`rgba(255,225,168,${.65*(1-age/.65)})`;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,4+age*r*2.1,2+age*r*.9,0,0,Math.PI*2);c.stroke();}
  }
  for(let i=0;i<15;i++){
    const dx=(rng()-.5)*r*.95,dy=-rng()*r*.55,delay=rng()*.12,life=.35+rng()*.5,t=(age-delay)/life;
    if(t<0||t>1)continue;const radius=(4+rng()*r*.32)*Math.sin(t*Math.PI);
    const px=x+dx*(.5+t),py=y+dy-t*9;
    ellipse(c,px,py,radius,radius*.9,['#da6547','#ed9652','#fbc16c','#ffe7a2'][i%4]);
    if(i%3===0)ellipse(c,px-radius*.15,py-radius*.15,radius*.45,radius*.4,'#fff1bd');
  }
  if(!reduced)for(let i=0;i<42;i++){
    const a=-Math.PI+rng()*Math.PI,v=14+rng()*r*2.2,life=.6+rng()*1.2;if(age>life)continue;
    const px=x+Math.cos(a)*v*age,py=y+Math.sin(a)*v*age+55*age*age;
    c.fillStyle=i%4?'#bd9b73':'#ffe19a';c.globalAlpha=1-age/life;c.fillRect(px,py,i%3?1:2,i%3?1:2);c.globalAlpha=1;
  }
  if(age>.12)smoke(c,x,y-4,age,impact.seed+7,1.45);
}

export class Renderer {
  constructor(canvas,spriteUrls=[]){
    this.canvas=canvas;canvas.width=WIDTH*2;canvas.height=HEIGHT*2;this.ctx=canvas.getContext('2d');
    this.buffer=document.createElement('canvas');this.landscape=document.createElement('canvas');this.key='';this.skySeed=null;this.lastTrace=null;this.impact=null;
    this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sprites=spriteUrls.map(url=>{const image=new Image();image.src=url;return image;});
  }
  draw(arena,config,{time=0,shot=null,progress=0,aim=null,round=1,wins=[]}={}){
    const c=this.ctx;c.setTransform(2,0,0,2,0,0);c.imageSmoothingEnabled=true;
    if(this.skySeed!==arena.seed){skyLandscape(this.landscape,arena.seed);this.skySeed=arena.seed;this.lastTrace=null;this.impact=null;}
    const key=`${arena.seed}:${arena.craters.length}:${config.terrain}:${arena.tanks.length}`;
    if(key!==this.key){const terrain=new Terrain(arena.seed,config.terrain,arena.tanks.length,arena.craters);paintTerrain(this.buffer,terrain);dressTerrain(this.buffer,terrain);this.key=key;}
    c.drawImage(this.landscape,0,0,WIDTH,HEIGHT);
    c.save();
    const age=shot?progress-shot.duration:-1;
    if(!this.reduced&&age>=0&&age<.35&&shot.hit?.kind!=='miss')c.translate(Math.sin(age*63)*(1-age/.35)*1.5,Math.cos(age*52)*(1-age/.35)*.8);
    c.imageSmoothingEnabled=false;c.drawImage(this.buffer,0,0);c.imageSmoothingEnabled=true;
    if(shot?.path.length)this.lastTrace={seed:arena.seed,path:shot.path};
    if(!shot&&this.lastTrace){
      c.strokeStyle='#ecdfb033';c.lineWidth=.65;c.setLineDash([1,4]);c.beginPath();this.lastTrace.path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);
    }
    const tanks=arena.tanks.map(t=>({...t}));
    if(shot&&progress>=shot.duration)for(const f of shot.falls){const u=clamp((age-.2)/.65,0,1);tanks[f.tank].y=f.from+(f.to-f.from)*u*u;}
    tanks.forEach((t,i)=>{
      if(t.y>HEIGHT+8)return;
      const active=i===arena.active,alive=t.hp>0,a=(aim&&active?aim.angle:t.angle)*Math.PI/180;
      const recoil=shot?.shooter===i&&progress<.18?Math.sin(progress/.18*Math.PI)*1.3:0;
      const x=t.x+Math.cos(a)*-recoil,y=t.y;
      ellipse(c,x,y+1,12,2.2,'#15292780');
      if(!alive){
        c.fillStyle='#283535';c.fillRect(x-8,y-4,16,4);c.beginPath();c.moveTo(x-6,y-4);c.lineTo(x-3,y-10);c.lineTo(x+5,y-8);c.lineTo(x+8,y-4);c.fill();
        c.strokeStyle='#69594b';c.lineWidth=2;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+9,y-4);c.stroke();
        smoke(c,x,y-8,this.reduced?1:time+i,i*97+arena.seed,.8);return;
      }
      const sprite=this.sprites[i%this.sprites.length];
      if(sprite?.complete&&sprite.naturalWidth){
        c.save();c.translate(x,y);if(Math.cos(a)>0)c.scale(-1,1);
        c.globalAlpha=t.hp<25?.8:1;c.drawImage(sprite,-12.5,-16,25,16);c.restore();
      }else{
        c.fillStyle='#202d31';c.fillRect(x-9,y-4,18,4);c.fillStyle=t.colour;c.fillRect(x-7,y-8,14,5);c.fillRect(x-4,y-11,8,4);
      }
      // A metallic independent barrel follows the exact physics muzzle.
      const ex=x+Math.cos(a)*14,ey=y-10-Math.sin(a)*14;
      c.lineCap='round';c.strokeStyle='#17262b';c.lineWidth=3.5;c.beginPath();c.moveTo(x,y-10);c.lineTo(ex,ey);c.stroke();
      c.strokeStyle='#afbcaa';c.lineWidth=2.1;c.stroke();c.strokeStyle=t.colour;c.lineWidth=.65;c.beginPath();c.moveTo(x,y-10.6);c.lineTo(ex,ey-.6);c.stroke();c.lineCap='butt';
      ellipse(c,x,y-10,2.1,1.5,'#677666');ellipse(c,x-.5,y-10.5,.8,.6,'#d0d5b8');
      if(t.hp<50)smoke(c,x-2,y-15,this.reduced?1:time+i,arena.seed+i*7,.6);
      // Thin team pennants, a number badge and readable unit health.
      c.strokeStyle='#f7efcb99';c.lineWidth=.6;c.beginPath();c.moveTo(x-10,y-2);c.lineTo(x-10,y-21);c.stroke();
      c.fillStyle=t.colour;c.beginPath();c.moveTo(x-10,y-21);c.lineTo(x-3,y-19);c.lineTo(x-10,y-16);c.fill();
      if(active&&!shot){
        const dy=this.reduced?0:Math.sin(time*3.5)*1.2;c.strokeStyle='#f4dfaa';c.lineWidth=.7;c.beginPath();c.ellipse(x,y+1,15,4,0,0,Math.PI*2);c.stroke();
        c.fillStyle='#f6dd9c';c.beginPath();c.moveTo(x-2.5,y-31+dy);c.lineTo(x+2.5,y-31+dy);c.lineTo(x,y-27+dy);c.fill();
      }
      c.fillStyle='#0d242bcc';c.fillRect(x-13,y+5,26,4);c.fillStyle=t.colour;c.fillRect(x-12,y+6,24*t.hp/100,2);
      label(c,`P${i+1} · ${t.hp}`,x,y+15,t.colour,6);
      if(shot?.shooter===i&&progress<.19){
        const f=1-progress/.19;c.save();c.translate(ex,ey);c.rotate(-a);c.fillStyle='#fff0be';c.beginPath();c.moveTo(0,-2*f);c.lineTo(9*f,0);c.lineTo(0,2*f);c.lineTo(3*f,0);c.fill();c.restore();
      }
    });
    if(shot?.path.length){
      const tip=replayTip(shot.path,Math.min(progress,shot.duration));
      if(tip){
        const start=Math.max(0,tip.index-65);
        for(let i=start+1;i<=tip.index;i++){const u=(i-start)/Math.max(1,tip.index-start);c.strokeStyle=`rgba(255,231,177,${.1+u*.6})`;c.lineWidth=.5+u*.7;c.beginPath();c.moveTo(shot.path[i-1][0],shot.path[i-1][1]);c.lineTo(shot.path[i][0],shot.path[i][1]);c.stroke();}
        if(progress<shot.duration){
          if(tip.y<30){c.fillStyle='#f4d9a2';c.beginPath();c.moveTo(tip.x-3,35);c.lineTo(tip.x+3,35);c.lineTo(tip.x,31);c.fill();label(c,'↑',tip.x,44,'#f4d9a2',7);}
          else{const glow=c.createRadialGradient(tip.x,tip.y,0,tip.x,tip.y,5);glow.addColorStop(0,'#ffedb9b8');glow.addColorStop(1,'#ffedb900');c.fillStyle=glow;c.fillRect(tip.x-5,tip.y-5,10,10);ellipse(c,tip.x,tip.y,1.5,1.5,'#fff7da');}
        }
      }
      if(age>=0&&shot.hit&&shot.hit.kind!=='miss')this.impact={x:shot.hit.x,y:shot.hit.y,at:time-age,radius:config.blastRadius,seed:shot.before.seed+shot.before.turn*97};
    }
    drawBlast(c,this.impact,time,this.reduced);c.restore();
    // The HUD sits outside camera recoil so angle, score and wind stay legible.
    const hud=c.createLinearGradient(0,0,0,33);hud.addColorStop(0,'#0c2435f2');hud.addColorStop(1,'#0c2435bf');c.fillStyle=hud;c.fillRect(0,0,WIDTH,30);c.fillStyle='#e7d19b66';c.fillRect(0,29.5,WIDTH,.5);
    label(c,`ROUND ${String(round).padStart(2,'0')}  /  TURN ${String(arena.turn+1).padStart(2,'0')}`,12,15,'#f6e3b6',8,'left');
    const wx=320,wind=arena.wind;c.strokeStyle='#b9d6cb';c.lineWidth=1;c.beginPath();c.moveTo(wx-25,15);c.lineTo(wx+25,15);c.stroke();
    c.strokeStyle='#f1dca6';c.lineWidth=2;c.beginPath();c.moveTo(wx,15);c.lineTo(wx+wind/35*25,15);c.stroke();
    if(wind){const dir=wind>0?1:-1,x=wx+wind/35*25;c.fillStyle='#f1dca6';c.beginPath();c.moveTo(x,15);c.lineTo(x-dir*4,12);c.lineTo(x-dir*4,18);c.fill();}
    label(c,config.windMode==='off'?'WIND OFF':`WIND ${wind>0?'→':wind<0?'←':'·'} ${Math.abs(wind)}`,wx+40,15,'#bbd4cf',7,'left');
    label(c,wins.map((w,i)=>`P${i+1} ${w}`).join('   '),WIDTH-12,15,'#f6e3b6',8,'right');
  }
}
