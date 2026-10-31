import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,Image} from '@napi-rs/canvas';
import {readFile} from 'node:fs/promises';
import {Terrain,newMatch,settings,settleTanks,resolveShot,planAI,WIDTH,HEIGHT} from '../tanx-core.mjs';
import {Renderer} from '../tanx-industrial.mjs';
import {defaultState,applyTurn} from '../game-engine.mjs';
import {createClassroomService} from '../netlify/functions/_shared/classroom-service.mjs';

test('new arenas separate supported tanks on unequal-height perches with deterministic material masks',()=>{
  assert.equal(settings({}).arena,'classic');
  for(const arena of ['industrial','desert'])for(const terrain of ['gentle','rolling','mountains'])for(const count of [2,3,4]){
    const players=Array.from({length:count},(_,i)=>({name:`P${i}`})),m=newMatch({arena,terrain},players,42);
    const a=new Terrain(42,terrain,count,[],arena),b=new Terrain(42,terrain,count,[],arena);
    assert.deepEqual(a.data,b.data);assert.deepEqual(a.materials,b.materials);
    for(const t of m.arena.tanks){assert.ok(a.supported(t));assert.ok(!a.solid(t.x,t.y-1));}
    if(count===2){assert.ok(m.arena.tanks[1].x-m.arena.tanks[0].x>WIDTH*.75);assert.ok(Math.abs(m.arena.tanks[1].y-m.arena.tanks[0].y)>30);}
    assert.ok(a.materials.includes(2));if(arena==='desert'){
      assert.ok(a.materials.includes(4));assert.ok(!a.materials.includes(3));
      const perch=a.structures[0];assert.ok(!a.solid(perch.x+38,perch.y+30));assert.ok(a.solid(perch.x+9,perch.y+30));
    }else assert.ok(a.materials.includes(3));
  }
});

test('destroying supports drops physical structure pieces, preserves their materials and lowers the tank',()=>{
  for(const arena of ['industrial','desert']){
    const m=newMatch({arena},[{name:'A'},{name:'B'}],42),t=new Terrain(42,'rolling',2,[],arena);
    const before=structuredClone(m.arena.tanks);t.carve(575,246,48);
    assert.ok(t.collapses.some(c=>c.cells>100&&c.drop>20));
    const falls=settleTanks(t,m.arena.tanks,m.config);assert.ok(falls.some(f=>f.tank===1&&f.to>f.from+20));
    assert.ok(m.arena.tanks[1].y>before[1].y);assert.ok(t.supported(m.arena.tanks[1]));
    const reconstructed=new Terrain(42,'rolling',2,t.craters,arena);
    assert.deepEqual(reconstructed.data,t.data);assert.deepEqual(reconstructed.materials,t.materials);
    for(let i=0;i<t.data.length;i++)assert.equal(Boolean(t.data[i]),Boolean(t.materials[i]));
  }
});

test('ammunition trades crater size against damage and rejects forged loadouts',()=>{
  const m=newMatch({windMode:'off',gravity:0,falling:false},[{name:'A'},{name:'B'}],42);
  m.arena.tanks[0].y=m.arena.tanks[1].y=50;m.arena.tanks[1].x=120;
  const standard=resolveShot(m.arena,0,60,m.config,true,'standard'),breach=resolveShot(m.arena,0,60,m.config,true,'breach'),precision=resolveShot(m.arena,0,60,m.config,true,'precision');
  assert.equal(standard.damage[1],90);assert.ok(breach.damage[1]<standard.damage[1]);assert.ok(precision.damage[1]>standard.damage[1]);
  assert.ok(breach.blastRadius>standard.blastRadius&&precision.blastRadius<standard.blastRadius);
  for(const ammo of ['nuclear','__proto__',[],{radius:10000},null])assert.throws(()=>resolveShot(m.arena,0,60,m.config,true,ammo),/ammunition/);
  const before=structuredClone(m.arena),disabled=resolveShot(m.arena,0,60,m.config,false,'breach');
  assert.equal(disabled.crater,null);assert.deepEqual(disabled.path,[]);assert.deepEqual(disabled.structureFalls,[]);assert.deepEqual(m.arena,before);
});

test('wind-aware CPU and classroom turn engine use the actual ruins and selected ammunition',()=>{
  for(const arena of ['industrial','desert']){
    const state=defaultState('tanx',{arena,windMode:'off',difficulty:'elite'},{seed:42});
    const aim=planAI(state.battle.arena,state.battle.config,()=>.5);
    const result=applyTurn('tanx',state,{actor:'A',...aim,ammo:'breach',answerCorrect:true});
    assert.equal(result.replay.ammo,'breach');assert.ok(result.replay.crater.r>state.battle.config.blastRadius);
    assert.ok(result.replay.damage[1]>0);assert.equal(result.state.battle.config.arena,arena);
    assert.throws(()=>applyTurn('tanx',state,{actor:'A',...aim,ammo:'forged',answerCorrect:true}),/ammunition/);
  }
});

test('both cinematic themes render loaded assets, craters and effects without changing game state',async()=>{
  globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=Image;
  const art={},sprites=await Promise.all(['tank-a','tank-b'].map(async n=>'data:image/png;base64,'+(await readFile(new URL(`../assets/tanx/${n}.png`,import.meta.url))).toString('base64')));
  for(const[key,name]of Object.entries({city:'industrial-city',desert:'desert-frontier',materials:'industrial-materials'}))art[key]='data:image/webp;base64,'+(await readFile(new URL(`../assets/tanx/${name}.webp`,import.meta.url))).toString('base64');
  for(const arena of ['industrial','desert']){
    const target=createCanvas(1,1),renderer=new Renderer(target,sprites,art),m=newMatch({arena},[{name:'A'},{name:'B'}],42);
    await Promise.all([renderer.city,renderer.desert,renderer.atlas,...renderer.sprites].map(i=>i.decode()));
    const aim=planAI(m.arena,m.config,()=>.5),shot=resolveShot(m.arena,aim.angle,aim.power,m.config,true,'breach'),snapshot=JSON.stringify({m,shot});
    for(const tactical of [false,true])for(const reduced of [false,true]){
      renderer.tactical=tactical;renderer.reduced=reduced;
      renderer.draw(m.arena,m.config,{aim:{...aim,ammo:'breach'},time:2});
      for(const progress of [.05,shot.duration/2,shot.duration+.15,shot.duration+.6]){
        const a=progress<shot.duration?shot.before:shot.after;renderer.draw(a,m.config,{shot,progress,time:progress});
      }
    }
    assert.equal(JSON.stringify({m,shot}),snapshot);assert.equal(target.width,1280);assert.equal(target.height,800);
    const terrain=new Terrain(42,'rolling',2,shot.after.craters,arena);assert.deepEqual(renderer.terrain.data,terrain.data);
    const rgba=target.getContext('2d').getImageData(0,0,target.width,target.height).data;for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],255);
  }
});

test('teacher can assign either arena and submitted ammo is graded and stored authoritatively',async()=>{
  const entries=new Map();let revision=0;const store={async get(k){return structuredClone(entries.get(k)?.data??null);},async getWithMetadata(k){return structuredClone(entries.get(k)??null);},async setJSON(k,data,c={}){const old=entries.get(k);if(c.onlyIfNew&&old||c.onlyIfMatch&&old?.etag!==c.onlyIfMatch)return{modified:false};entries.set(k,{data:structuredClone(data),etag:String(++revision)});return{modified:true};}};
  const service=createClassroomService({store,env:key=>key==='CLASSROOM_TEACHER_CODE'?'code':''}),user=id=>({id,confirmedAt:'2026-01-01'}),teacher=user('teacher'),a=user('a'),b=user('b');
  const run=(u,action,body)=>service.execute(u,action,body);
  await run(teacher,'activate-teacher',{code:'code'});const{classId}=await run(teacher,'class-create',{name:'Class'}),{invites}=await run(teacher,'roster-add',{classId,names:'Ada\nMert'});
  await run(a,'join',{code:invites[0].code});await run(b,'join',{code:invites[1].code});
  const{poolId}=await run(teacher,'pool-save',{name:'Words',questions:[{prompt:'Huge means…',type:'multiple-choice',options:['enormous','tiny'],answer:'enormous'}]});
  for(const arena of ['industrial','desert']){
    const{matchId}=await run(teacher,'assign',{classId,poolId,playerA:invites[0].id,playerB:invites[1].id,gameType:'tanx',settings:{arena,windMode:'off'}});
    const{match:current}=await run(a,'match',{teacherId:'teacher',matchId});assert.equal(current.battle.config.arena,arena);
    const result=await run(a,'submit',{teacherId:'teacher',matchId,version:current.turn.version,turnId:current.turn.id,answer:'enormous',angle:55,power:80,ammo:'breach'});
    assert.equal(result.match.history.at(-1).ammo,'breach');assert.equal(result.match.battle.config.arena,arena);
  }
});
