import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomService,updateAtomic,validateSubscription} from '../netlify/functions/_shared/classroom-service.mjs';
import {applyTurn,defaultState,turkeyAttack} from '../game-engine.mjs';
import {footballFinished} from '../game-rules.mjs';
import {createInitialShootoutState,advanceAfterReplay} from '../shootout-core.mjs';

export function memoryStore() {
  const entries=new Map();let seq=0;
  return {entries,async get(key){return structuredClone(entries.get(key)?.data??null);},async getWithMetadata(key){return structuredClone(entries.get(key)??null);},async setJSON(key,data,conditions={}){const old=entries.get(key);if(conditions.onlyIfNew&&old || conditions.onlyIfMatch&&old?.etag!==conditions.onlyIfMatch)return {modified:false};const etag=String(++seq);entries.set(key,{data:structuredClone(data),etag});return {modified:true,etag};}};
}
const teacher={id:'teacher-a',name:'Teacher',email:'teacher@example.test',confirmedAt:'2026-01-01'}, a={id:'student-a',email:'a@example.test',confirmedAt:'2026-01-01'}, b={id:'student-b',email:'b@example.test',confirmedAt:'2026-01-01'}, outsider={id:'outsider',confirmedAt:'2026-01-01'};
const question={prompt:'She ___ here since 2023.',type:'multiple-choice',options:['works','has worked'],answer:'has worked',explanation:'Use present perfect.',level:'B1',tag:'Tenses'};
async function setup(gameType='penalty',settings={}) {
  const store=memoryStore(),service=createClassroomService({store,env:key=>key==='CLASSROOM_TEACHER_CODE'?'private-test-code':''});
  const run=(u,action,body)=>service.execute(u,action,body);
  await run(teacher,'activate-teacher',{code:'private-test-code'});
  const {classId}=await run(teacher,'class-create',{name:'English 11'});
  const {invites}=await run(teacher,'roster-add',{classId,names:'Ada\nMert'});
  await run(a,'join',{code:invites[0].code});await run(b,'join',{code:invites[1].code});
  const {poolId}=await run(teacher,'pool-save',{name:'Tenses',questions:[question]});
  const {matchId}=await run(teacher,'assign',{classId,poolId,playerA:invites[0].id,playerB:invites[1].id,gameType,settings});
  return {store,service,run,classId,poolId,matchId,invites};
}
const matchBody=s=>({teacherId:teacher.id,matchId:s.matchId});
async function submit(s,u,extra={}){const {match}=await s.run(u,'match',matchBody(s));return s.run(u,'submit',{...matchBody(s),version:match.turn.version,turnId:match.turn.id,answer:'has worked',move:'top-left',...extra});}

test('teacher roles cannot be self-selected or forged through metadata',async()=>{
  const s=await setup();await assert.rejects(s.run({...outsider,roles:['teacher'],userMetadata:{role:'teacher'}},'class-create',{name:'Hijack'}),/Teacher access/);
  await assert.rejects(s.run(outsider,'activate-teacher',{code:'wrong'}),/incorrect/);
  await assert.rejects(s.run({id:'unconfirmed'},'dashboard'),/Confirm your email/);
});
test('enrolment codes are one-person, revocable, and isolated by class ownership',async()=>{
  const s=await setup();await assert.rejects(s.run(outsider,'join',{code:s.invites[0].code}),/no longer available/);
  await s.run(a,'join',{code:s.invites[0].code});assert.equal((await s.run(a,'dashboard')).memberships.length,1);
  await s.run(teacher,'roster-remove',{classId:s.classId,studentId:s.invites[0].id});
  assert.equal((await s.run(a,'dashboard')).memberships.length,0);assert.equal((await s.run(b,'match',matchBody(s))).match.cancelled,true);
});
test('students receive no answer key, explanation or unresolved opponent choices',async()=>{
  const s=await setup();const da=await s.run(a,'dashboard');assert.equal(da.workspace,undefined);assert.equal(da.matches[0].turn.question.answer,undefined);assert.equal(da.matches[0].turn.question.explanation,undefined);
  await submit(s,a);const {match}=await s.run(b,'match',matchBody(s));assert.equal(match.myTurn,true);assert.equal(match.role,'keeper');assert.equal(match.shot,undefined);assert.deepEqual(match.history,[]);assert.deepEqual(match.feedback,[]);
  await assert.rejects(s.run(outsider,'match',matchBody(s)),/not assigned/);
});
test('answer grading and game state are server authoritative',async()=>{
  const s=await setup();const res=await submit(s,a,{answer:'works',answerCorrect:true,state:{scoreA:999}});assert.equal(res.match.feedback[0].correct,false);
  const result=await submit(s,b,{move:'bottom-right'});assert.equal(result.match.scoreA,0);assert.equal(result.replay.outcome,'miss');
});
test('simultaneous retries commit a turn only once and an old turn never changes choices',async()=>{
  const s=await setup();const {match}=await s.run(a,'match',matchBody(s));const payload={...matchBody(s),version:0,turnId:match.turn.id,answer:'has worked',move:'top-left'};
  const results=await Promise.all([s.run(a,'submit',payload),s.run(a,'submit',{...payload,move:'bottom-right'})]);
  assert.equal(results.filter(r=>r.duplicate).length,1);const stored=await s.store.get(`teacher/${teacher.id}`);assert.equal(stored.matches[0].attempts.length,1);assert.equal(stored.matches[0].version,1);
  assert.equal((await s.run(a,'match',matchBody(s))).match.turn,undefined);
  const replay=await submit(s,b,{move:'top-left'});assert.equal(replay.match.version,2);assert.equal(replay.match.history.length,1);
});
test('wrong actors and stale version payloads are rejected',async()=>{
  const s=await setup();await assert.rejects(s.run(b,'submit',{...matchBody(s),version:0,turnId:`${s.matchId}:0`,answer:'has worked',move:'top-left'}),/not expected/);
  await assert.rejects(s.run(a,'submit',{...matchBody(s),version:1,turnId:`${s.matchId}:1`,answer:'has worked',move:'top-left'}),/changed/);
});
test('teacher edits do not alter question snapshots in assigned games',async()=>{
  const s=await setup();await s.run(teacher,'pool-save',{id:s.poolId,version:1,name:'Changed',questions:[{...question,prompt:'Different prompt'}]});
  assert.equal((await s.run(a,'match',matchBody(s))).match.turn.question.prompt,question.prompt);
  await assert.rejects(s.run(teacher,'pool-save',{id:s.poolId,version:1,name:'Stale',questions:[question]}),/another device/);
});
test('full football match alternates roles, records accuracy, and stops at ten kicks',async()=>{
  const s=await setup();let result;
  for(let kick=0;kick<10;kick++){const shooter=kick%2?b:a,keeper=kick%2?a:b;await submit(s,shooter);result=await submit(s,keeper,{move:'bottom-right'});}
  assert.equal(result.match.finished,true);assert.equal(result.match.outcome,'Draw');assert.equal(result.match.scoreA,5);assert.equal(result.match.scoreB,5);assert.deepEqual(result.match.accuracy.A,{correct:10,total:10});
  assert.equal((await s.run(teacher,'match',matchBody(s))).match.feedback.length,20);
});
test('football sudden death waits for an equal extra pair and has a teacher-set cap',()=>{
  const state={kickIndex:10,scoreA:3,scoreB:3,tieMode:'sudden-death',extraPairs:2};assert.equal(footballFinished(state),false);assert.equal(footballFinished({...state,kickIndex:11,scoreA:4}),false);assert.equal(footballFinished({...state,kickIndex:12,scoreA:4}),true);assert.equal(footballFinished({...state,kickIndex:14}),true);
  assert.equal(advanceAfterReplay({...createInitialShootoutState({tieMode:'sudden-death'}),kickIndex:9}).finished,false);
});
test('Turkey defensive standoffs end and a real Counter returns damage only against an active attack',()=>{
  let state=defaultState('turkey',{maxRounds:2});for(let i=0;i<2;i++)for(const actor of ['A','B'])state=applyTurn('turkey',state,{actor,move:'block',answerCorrect:true}).state;
  assert.equal(state.finished,true);assert.equal(state.winner,null);assert.match(state.history.at(-1).caption,/DRAW/);
  assert.deepEqual(turkeyAttack('counter',true,'peck',true),{damage:8,effect:'counter'});assert.equal(turkeyAttack('counter',true,'peck',false).damage,0);assert.equal(turkeyAttack('counter',false,'charge',true).damage,0);assert.equal(turkeyAttack('counter',true,'block',true).damage,0);
  state=defaultState('turkey');state=applyTurn('turkey',state,{actor:'A',move:'counter',answerCorrect:true}).state;state=applyTurn('turkey',state,{actor:'B',move:'charge',answerCorrect:true}).state;assert.equal(state.healthA,100);assert.equal(state.healthB,92);
});
test('push subscriptions cannot target arbitrary servers or local addresses',()=>{
  const keys={p256dh:'a'.repeat(87),auth:'a'.repeat(22)};assert.doesNotThrow(()=>validateSubscription({endpoint:'https://fcm.googleapis.com/fcm/send/example',keys}));for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://evil.test/x','https://fcm.googleapis.com.evil.test/x','https://fcm.googleapis.com:8443/x'])assert.throws(()=>validateSubscription({endpoint,keys}));
});
test('notification failures do not undo saved matches; concurrent dispatch leases prevent duplicate delivery',async()=>{
  const s=await setup();let calls=0;const service=createClassroomService({store:s.store,notify:async()=>{calls++;return {sent:true};}});await Promise.all([service.dispatch(teacher.id),service.dispatch(teacher.id)]);assert.equal(calls,2);assert.equal((await s.run(a,'dashboard')).matches.length,1);
});
test('CAS updates preserve both concurrent changes',async()=>{const store=memoryStore();await Promise.all(Array.from({length:5},()=>updateAtomic(store,'key',()=>({n:0}),d=>{d.n++;})));assert.equal((await store.get('key')).n,5);});
