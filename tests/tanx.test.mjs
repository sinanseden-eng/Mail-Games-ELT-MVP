import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Terrain,settings,newMatch,nextRound,playMatch,planAI,resolveShot,launch,stepProjectile,windAt,settleTanks,STEP,WIDTH,HEIGHT} from '../tanx-core.mjs';
import {defaultState,applyTurn,currentTurn} from '../game-engine.mjs';
import {createClassroomService} from '../netlify/functions/_shared/classroom-service.mjs';
const crew=[{name:'Red',type:'human'},{name:'Blue',type:'cpu'}];
test('all terrain difficulties spawn 2–4 supported tanks with deterministic pixels',()=>{
 for(const kind of ['gentle','rolling','mountains'])for(let count=2;count<=4;count++)for(const seed of [1,42,0xffffffff]){
  const c=settings({terrain:kind}),m=newMatch(c,Array.from({length:count},(_,i)=>({name:`Tank ${i}`})),seed),a=new Terrain(seed,kind,count),b=new Terrain(seed,kind,count);
  assert.deepEqual(a.data,b.data);for(const t of m.arena.tanks){assert.ok(a.supported(t));assert.equal(a.solid(t.x,t.y-1),false);}
 }
});
test('a crater removes a circle of opaque pixels but preserves the roof of an overhang',()=>{
 const t=new Terrain(42);t.data.fill(255);t.carve(100,200,25);
 assert.equal(t.solid(100,200),false);assert.equal(t.solid(100,175),false);assert.equal(t.solid(100,174),true);assert.equal(t.solid(125,225),true);
 assert.equal(t.solid(-1,200),false);assert.equal(t.solid(640,0),false);
});
test('wind modes are deterministic, bounded, and either per-round, per-turn or off',()=>{
 for(const mode of ['off','round','turn']){
  const c=settings({windMode:mode});const values=Array.from({length:20},(_,turn)=>windAt(42,turn,c));assert.ok(values.every(v=>Math.abs(v)<=18));
  if(mode==='off')assert.ok(values.every(v=>v===0));else if(mode==='round')assert.equal(new Set(values).size,1);else assert.ok(new Set(values).size>1);
 }
});
test('fixed-step shots can rise above the screen, return, miss at an edge, and cannot tunnel through a pixel',()=>{
 const c=settings({windMode:'off'}),m=newMatch(c,crew,34),t=new Terrain(m.arena.seed);
 let p=launch(m.arena.tanks[0],85,100),hit=null,above=false;
 while(!hit){hit=stepProjectile(p,t,m.arena.tanks,0,0,c);above ||= p.y<0;}
 assert.ok(above);assert.ok(hit.kind==='terrain'||hit.kind==='tank');
 const empty=new Terrain(1);empty.data.fill(0);empty.data[200*WIDTH+100]=255;
 p={x:90,y:200,vx:4000,vy:0,age:0};hit=stepProjectile(p,empty,[],0,0,settings({gravity:0}),.01);assert.equal(hit.kind,'terrain');assert.ok(hit.x<=101);
 p={x:1,y:100,vx:-500,vy:0,age:0};assert.equal(stepProjectile(p,empty,[],0,0,c).kind,'miss');
});
test('crater support loss drops tanks and falling out destroys them',()=>{
 const t=new Terrain(7);t.data.fill(0);for(let x=0;x<WIDTH;x++)t.data[350*WIDTH+x]=255;
 const tanks=[{x:100,y:200,hp:100}];let falls=settleTanks(t,tanks,settings());assert.equal(tanks[0].y,350);assert.ok(tanks[0].hp<100);assert.equal(falls.length,1);
 t.data.fill(0);settleTanks(t,tanks,settings());assert.equal(tanks[0].hp,0);
});
test('wind-aware CPU can target an enemy across terrain from either side',()=>{
 for(const seed of [8,42,321])for(const active of [0,1]){
  const m=newMatch({difficulty:'elite'},crew,seed);m.arena.active=active;
  const shot=planAI(m.arena,m.config,()=>.5),result=resolveShot(m.arena,shot.angle,shot.power,m.config);
  assert.ok(result.damage[1-active]>0,`seed ${seed}, active ${active}`);assert.equal(result.before.tanks[active].hp,100);
 }
});
test('mechanic toggles really disable wind, terrain cuts, damage and collisions',()=>{
 const config=settings({windMode:'off',damage:false,destructible:false,falling:false});const m=newMatch(config,crew,42);
 const aim=planAI(m.arena,config,()=>.5),r=resolveShot(m.arena,aim.angle,aim.power,config);
 assert.equal(r.after.wind,0);assert.deepEqual(r.damage,[0,0]);assert.deepEqual(r.after.craters,[]);assert.deepEqual(r.falls,[]);
 const noCollision=settings({gravity:0,terrainCollision:false,tankCollision:false});const result=resolveShot(m.arena,0,100,noCollision);assert.equal(result.hit.kind,'miss');
});
test('a disabled answer passes the turn without changing health, craters or firing',()=>{
 const m=newMatch({},crew,42),frozen=JSON.stringify(m);const {match,replay}=playMatch(m,60,80,false);
 assert.equal(JSON.stringify(m),frozen);assert.equal(match.arena.active,1);assert.deepEqual(match.arena.craters,[]);assert.deepEqual(match.arena.tanks.map(t=>t.hp),[100,100]);assert.deepEqual(replay.path,[]);
});
test('round limits break no-damage stalemates; elimination skips dead tanks and scores wins',()=>{
 let m=newMatch({turnLimit:4,roundsToWin:1,damage:false},crew,42),r;
 for(let i=0;i<8;i++){r=playMatch(m,90,0,false);m=r.match;}assert.equal(r.replay.over,true);assert.equal(r.replay.winner,null);assert.equal(m.finished,false);
 m=newMatch({roundsToWin:1},crew,42);m.arena.tanks[1].hp=1;const aim=planAI(m.arena,m.config,()=>.5);r=playMatch(m,aim.angle,aim.power);assert.equal(r.match.finished,true);assert.equal(r.match.winner,0);assert.deepEqual(r.match.wins,[1,0]);
 const next=nextRound(r.match);assert.notEqual(next.arena.seed,m.arena.seed);assert.equal(next.arena.active,1);
});
test('invalid or forged aiming values are rejected instead of clamped by the server',()=>{
 const s=defaultState('tanx',{seed:42});for(const [angle,power] of [[181,10],[1,-1],['45',50],[45,NaN],[null,50],[12.5,60]])assert.throws(()=>applyTurn('tanx',s,{actor:'A',angle,power,answerCorrect:true}),/angle/);
 assert.throws(()=>applyTurn('tanx',s,{actor:'B',angle:45,power:60,answerCorrect:true}),/not expected/);
 assert.throws(()=>settings({windMode:'tornado'}));assert.throws(()=>settings({damage:'false'}));
});
test('classroom state limits repeated incorrect-answer draws and preserves round wins',()=>{
 let s=defaultState('tanx',{turnLimit:4,roundsToWin:1,seed:42});let n=0;
 while(!s.finished&&n<80){s=applyTurn('tanx',s,{actor:currentTurn('tanx',s).actor,angle:45,power:60,answerCorrect:false}).state;n++;}
 assert.equal(s.finished,true);assert.equal(n,24);assert.equal(s.winner,null);assert.equal(s.history.length,24);
});
test('standalone output contains all code, both embedded tanks, and no external dependencies',async()=>{
 const html=await readFile(new URL('../tanx.html',import.meta.url),'utf8');assert.ok(html.includes('data:image/png;base64,'));assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,2);
 assert.equal(/<(?:script|link|img)[^>]+(?:src|href)=['"]https?:/i.test(html),false);assert.equal(/\bimport\s.*from\s+['"]/.test(html),false);
 for(const required of ['class Terrain','stepProjectile','class AudioFX','planAI','destination-out','class Renderer'])assert.ok(html.includes(required));
});
function memoryStore(){const entries=new Map();let n=0;return {entries,async get(k){return structuredClone(entries.get(k)?.data??null);},async getWithMetadata(k){return structuredClone(entries.get(k)??null);},async setJSON(k,data,c={}){const old=entries.get(k);if(c.onlyIfNew&&old||c.onlyIfMatch&&old?.etag!==c.onlyIfMatch)return {modified:false};entries.set(k,{data:structuredClone(data),etag:String(++n)});return {modified:true};}};}
test('teacher assignment, question grading, stale retry and turn handoff use server-authoritative Tanx',async()=>{
 const store=memoryStore(),service=createClassroomService({store,env:k=>k==='CLASSROOM_TEACHER_CODE'?'code':''}),user=id=>({id,confirmedAt:'2026-01-01'}),teacher=user('teacher'),a=user('a'),b=user('b');
 const run=(u,action,body)=>service.execute(u,action,body);
 await run(teacher,'activate-teacher',{code:'code'});const {classId}=await run(teacher,'class-create',{name:'Class'});const {invites}=await run(teacher,'roster-add',{classId,names:'Ada\nMert'});await run(a,'join',{code:invites[0].code});await run(b,'join',{code:invites[1].code});
 const {poolId}=await run(teacher,'pool-save',{name:'Words',questions:[{prompt:'Select huge.',type:'multiple-choice',options:['enormous','tiny'],answer:'enormous',explanation:'Huge means enormous.',level:'B1'}]});
 const {matchId}=await run(teacher,'assign',{classId,poolId,playerA:invites[0].id,playerB:invites[1].id,gameType:'tanx',settings:{terrain:'gentle',windMode:'off'}});
 await assert.rejects(run(teacher,'assign',{classId,poolId,playerA:invites[0].id,playerB:invites[1].id,gameType:'turkey'}),/Choose Football/);
 const ref={teacherId:'teacher',matchId};let {match}=await run(a,'match',ref);assert.equal(match.role,'commander');assert.equal(match.turn.question.answer,undefined);assert.equal(match.battle.arena.tanks[0].name,'Ada');
 const payload={...ref,version:0,turnId:match.turn.id,answer:'tiny',angle:45,power:80,answerCorrect:true};const result=await run(a,'submit',payload);assert.equal(result.replay.enabled,false);assert.equal(result.match.healthA,100);assert.equal(result.match.healthB,100);assert.equal(result.match.currentActor,'B');
 assert.equal((await run(a,'submit',payload)).duplicate,true);
 ({match}=await run(b,'match',ref));assert.equal(match.myTurn,true);const result2=await run(b,'submit',{...ref,version:1,turnId:match.turn.id,answer:'enormous',angle:135,power:60});assert.equal(result2.replay.enabled,true);assert.equal(result2.match.history.length,2);assert.equal(result2.match.currentActor,'A');
 assert.equal((await run(teacher,'match',ref)).match.feedback.length,2);
});
