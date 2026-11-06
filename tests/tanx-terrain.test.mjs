import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Terrain,TERRAINS,newMatch,createArena,planAI,resolveShot,launch,WIDTH} from '../tanx-core.mjs';

const crew=count=>Array.from({length:count},(_,i)=>({name:`Player ${i+1}`}));
const ground=(m,craters=m.arena.craters)=>new Terrain(m.seed,m.config.terrain,m.players.length,craters,m.config.arena,m.config.terrainVersion);
function blocksDirectLine(t,a,b){
  for(let x=a.x+20;x<b.x-20;x++)if(t.solid(x,a.y-10+(b.y-a.y)*(x-a.x)/(b.x-a.x)))return true;
  return false;
}

test('every new terrain in both arenas starts 2–4 unburied tanks on natural ground, never a tower',()=>{
  for(const arena of ['industrial','desert'])for(const terrain of Object.keys(TERRAINS))for(const count of [2,3,4])for(const seed of [1,42,9817,74831]){
    const m=newMatch({arena,terrain},crew(count),seed),t=ground(m);
    assert.equal(m.config.terrainVersion,2);
    for(const tank of m.arena.tanks){
      assert.equal(tank.y,t.baseHeights[tank.x]);assert.equal(t.materials[tank.y*WIDTH+tank.x],1);assert.ok(t.supported(tank));assert.ok(tank.y<=343);
      for(let x=tank.x-11;x<=tank.x+11;x++)for(let y=tank.y-17;y<tank.y;y++)assert.equal(t.solid(x,y),false,`${arena}/${terrain}: buried tank`);
      for(const angle of [0,45,90,135,180]){const muzzle=launch(tank,angle,80);assert.equal(t.solid(muzzle.x,muzzle.y),false);}
    }
    assert.ok(!t.structures.some(s=>s.kind==='perch'));
  }
});

test('plains have clear sightlines while hills, mountains and expert layouts provide real cover',()=>{
  for(const arena of ['industrial','desert'])for(const seed of [1,42,9817,74831]){
    const ranges={};
    for(const terrain of Object.keys(TERRAINS)){
      const m=newMatch({arena,terrain},crew(2),seed),t=ground(m),[a,b]=m.arena.tanks;
      ranges[terrain]=Math.max(...t.baseHeights)-Math.min(...t.baseHeights);
      assert.equal(blocksDirectLine(t,a,b),terrain!=='gentle',`${terrain}: cover must block the line, not just be a backdrop`);
      assert.ok(b.x-a.x>WIDTH*.75);
      if(terrain==='canyon'){assert.ok(t.structures.some(s=>s.kind==='bridge-end'));assert.ok(Math.max(...t.baseHeights)>350);}
      if(terrain==='fortress')assert.ok(t.structures.filter(s=>s.kind==='cover-wall').length>=3);
    }
    assert.ok(ranges.gentle<28);assert.ok(ranges.rolling>85);assert.ok(ranges.mountains>180);assert.ok(ranges.canyon>210);assert.ok(ranges.fortress>135);
  }
});

test('CPU can clear every terrain from either side using the same collidable cover as players',()=>{
  for(const arena of ['industrial','desert'])for(const terrain of Object.keys(TERRAINS))for(const active of [0,1]){
    const m=newMatch({arena,terrain,windMode:'off',difficulty:'elite'},crew(2),42);m.arena.active=active;
    const before=structuredClone(m),aim=planAI(m.arena,m.config,()=>.5),shot=resolveShot(m.arena,aim.angle,aim.power,m.config);
    assert.ok(shot.damage[1-active]>0,`${arena}/${terrain}: no reachable AI shot from ${active}`);assert.deepEqual(m,before);
  }
});

test('expert terrain craters and fallen debris reconstruct deterministically from seed and version',()=>{
  for(const arena of ['industrial','desert'])for(const terrain of ['canyon','fortress']){
    const m=newMatch({arena,terrain},crew(2),42),a=ground(m),b=ground(m);
    assert.deepEqual(a.data,b.data);assert.deepEqual(a.materials,b.materials);
    const x=155,y=a.heights[x];a.carve(x,y+12,36);a.carve(320,a.heights[320]+7,45);
    const replayed=ground(m,a.craters);assert.deepEqual(replayed.data,a.data);assert.deepEqual(replayed.materials,a.materials);
  }
});

test('saved unversioned arenas retain their original map pixels and projectile results',()=>{
  const expected={
    'industrial/gentle':'117a72ad206a25349baa128bb13a412e3e7f65d2c0211e8fbc51c25677ce9114',
    'industrial/rolling':'82848fe6ed95ef7456b7ee325319b05ad0afa1292d38003bf6a5a89254502ea2',
    'industrial/mountains':'807d353548a5d13f0fc10b11ceef9ffc84d26257dbd92a99b511f7635d941506',
    'desert/gentle':'3f51dea13b2a68496c0d5a5fa6b9edb52d5713090722f696fdcb2e6792d29777',
    'desert/rolling':'8c1cb74922fcbdcd24f4ed3750c941dcd4ffa3675f2f36e496b64ab683dfcab3',
    'desert/mountains':'4540385fb3ba2e462e9fea7616232cc747a98093c93f5d8302b8b304b7a73b0e'
  };
  for(const[key,hash]of Object.entries(expected)){
    const[arena,terrain]=key.split('/'),t=new Terrain(42,terrain,2,[],arena);
    assert.equal(createHash('sha256').update(t.data).update(t.materials).digest('hex'),hash);
    const old=newMatch({arena,terrain,terrainVersion:1},crew(2),42),config={...old.config};delete config.terrainVersion;
    assert.deepEqual(createArena(42,config,old.players),old.arena);
    assert.deepEqual(resolveShot(old.arena,59,80,config),resolveShot(old.arena,59,80,old.config));
  }
});
