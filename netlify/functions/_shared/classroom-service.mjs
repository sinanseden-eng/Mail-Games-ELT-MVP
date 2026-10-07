import {randomUUID, randomBytes, createHash, timingSafeEqual} from 'node:crypto';
import {defaultState, currentTurn, applyTurn} from '../../../game-engine.mjs';
import {gameSettings} from '../../../game-rules.mjs';
import {cleanQuestion, validateQuestion, normal} from '../../../question-import.mjs';

export const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), {statusCode}); };
const text = (v, max = 100) => String(v ?? '').trim().slice(0, max);
const hash = v => createHash('sha256').update(String(v)).digest('hex');
const emptyProfile = () => ({teacher: false, memberships: [], subscriptions: [], emailReminders: false});
const emptyWorkspace = teacherId => ({teacherId, classes: [], pools: [], matches: [], outbox: [], version: 0});
const find = (items, id) => items.find(x => x.id === id) || fail('Item not found.', 404);
const outcome = m => m.cancelled ? 'Cancelled' : !m.state.finished ? 'In progress' : m.state.winner ? `${m.players[m.state.winner].name} wins` : 'Draw';

// The complete teacher workspace commits atomically: rules, scores, attempts and
// outbox events cannot be separated by a competing turn or a failed second write.
export async function updateAtomic(store, key, initial, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const found = await store.getWithMetadata(key, {type: 'json', consistency: 'strong'});
    const data = found ? found.data : initial();
    const result = await change(data);
    const written = await store.setJSON(key, data, found ? {onlyIfMatch: found.etag} : {onlyIfNew: true});
    if (written.modified) return result;
  }
  fail('Another device updated this class. Please retry.', 409);
}

export function createClassroomService({store, env = () => '', now = () => Date.now(), notify = async () => ({sent: false})}) {
  const read = (key) => store.get(key, {type: 'json', consistency: 'strong'});
  const profile = async uid => (await read(`profile/${uid}`)) || emptyProfile();
  const updateProfile = (uid, fn) => updateAtomic(store, `profile/${uid}`, emptyProfile, fn);
  const workspace = async uid => (await read(`teacher/${uid}`)) || emptyWorkspace(uid);
  const mutate = (uid, fn) => updateAtomic(store, `teacher/${uid}`, () => emptyWorkspace(uid), async w => {
    const result = await fn(w); w.version++; return result;
  });
  const teacher = async user => {if (!(await profile(user.id)).teacher) fail('Teacher access is required.', 403);};
  function queue(w, m, users, kind = 'turn') {
    // Bound completed delivery history; pending events expire after seven days.
    w.outbox = w.outbox.filter(e => !e.done && now() - e.createdAt < 7 * 86400000);
    for (const uid of new Set(users.filter(Boolean))) w.outbox.push({id: randomUUID(), matchId: m.id, teacherId: w.teacherId, userId: uid, kind, version: m.version, createdAt: now(), tries: 0});
  }
  function matchView(m, uid, isTeacher = false) {
    const actor = ['A', 'B'].find(a => m.players[a].userId === uid);
    if (!actor && !isTeacher) fail('This match is not assigned to you.', 403);
    const next = currentTurn(m.gameType, m.state);
    const active = !m.cancelled && !m.state.finished;
    const view = {id: m.id, teacherId: m.teacherId, classId: m.classId, title: m.title, gameType: m.gameType, version: m.version,
      players: Object.fromEntries(Object.entries(m.players).map(([a,p]) => [a,{name:p.name, studentId:p.studentId}])),
      settings: m.settings, createdAt: m.createdAt, finished: m.state.finished, cancelled: Boolean(m.cancelled), outcome: outcome(m),
      scoreA: m.state.scoreA, scoreB: m.state.scoreB, healthA: m.state.healthA, healthB: m.state.healthB,
      round: m.state.round, kickIndex: m.state.kickIndex, history: m.state.history, actor: actor || null,
      currentActor: active ? next.actor : null, role: active ? next.role : null, myTurn: active && next.actor === actor,
      accuracy: Object.fromEntries(['A','B'].map(a => { const tries=m.attempts.filter(t=>t.actor===a); return [a,{correct:tries.filter(t=>t.correct).length,total:tries.length}]; })),
      feedback: m.attempts.filter(t => isTeacher || t.actor === actor).map(t => ({actor:t.actor, turnId:t.turnId, correct:t.correct, prompt:t.prompt, answer:t.answer, submitted:t.submitted, explanation:t.explanation}))};
    if (view.myTurn) {
      const q = m.questions[m.version % m.questions.length];
      view.turn = {id: `${m.id}:${m.version}`, version: m.version, question: {prompt:q.prompt, type:q.type, options:q.options, level:q.level, tag:q.tag}};
    }
    return view;
  }
  async function dashboard(user) {
    const p = await profile(user.id);
    const own = p.teacher ? await workspace(user.id) : null;
    const result = {user:{id:user.id, name:user.name || user.email || 'Player', role:p.teacher?'teacher':'student'},
      preferences:{emailReminders:p.emailReminders, pushDevices:p.subscriptions.length}, memberships:[], matches:[],
      capabilities:{push:Boolean(env('CLASSROOM_VAPID_PUBLIC_KEY') && env('CLASSROOM_VAPID_PRIVATE_KEY')), vapidPublicKey:env('CLASSROOM_VAPID_PUBLIC_KEY') || '', teacherCode:Boolean(env('CLASSROOM_TEACHER_CODE') || env('MAILGAMES_TEST_CODE'))}};
    if (own) result.workspace = {version:own.version, classes:own.classes.map(c=>({...c,students:c.students.map(({codeHash, ...s})=>s)})), pools:own.pools,
      matches:own.matches.map(m=>matchView(m,user.id,true))};
    for (const teacherId of [...new Set(p.memberships)].slice(0,20)) {
      const w = await workspace(teacherId);
      for (const c of w.classes) if(c.students.some(s=>s.userId===user.id && !s.archived)) result.memberships.push({teacherId,classId:c.id,name:c.name});
      for (const m of w.matches) if(Object.values(m.players).some(s=>s.userId===user.id)) result.matches.push(matchView(m,user.id));
    }
    return result;
  }
  async function dispatch(teacherId) {
    const jobs = await mutate(teacherId, w => {
      const due = w.outbox.filter(e=>!e.done && (e.retryAt || 0)<=now() && e.tries<3).slice(0,6);
      for(const e of due){e.retryAt=now()+15*60000;e.tries++;}
      return structuredClone(due);
    });
    for (const event of jobs) {
      const p = await profile(event.userId);
      let delivered = false;
      try { delivered = (await notify(event, p)).sent; } catch { /* Match stays saved. Inbox is always authoritative. */ }
      await mutate(teacherId, w => {const e=w.outbox.find(x=>x.id===event.id);if(e && (delivered || e.tries>=3 || (!p.subscriptions.length && !p.emailReminders)))e.done=true;});
    }
  }
  async function execute(user, action, body = {}) {
    if (!user?.id) fail('Sign in to continue.', 401);
    if (!user.confirmedAt) fail('Confirm your email before joining a class.', 403);
    if (action === 'dashboard') return dashboard(user);
    if (action === 'activate-teacher') {
      const expected = env('CLASSROOM_TEACHER_CODE') || env('MAILGAMES_TEST_CODE');
      if (!expected) fail('Teacher activation has not been configured yet.', 503);
      const codeVersion = hash(expected);
      await updateProfile(user.id, p=>{
        // A rotated server secret starts a new attempt window. Legacy locks
        // without a version still expire normally; deployment alone cannot
        // reset a lock for an unchanged secret.
        const rotated = p.activationCodeVersion && p.activationCodeVersion !== codeVersion;
        if(rotated || (p.activationLockUntil && p.activationLockUntil<=now())){
          p.activationAttempts=0;p.activationLockUntil=0;
        }
        if(p.activationLockUntil>now()){
          const minutes=Math.max(1,Math.ceil((p.activationLockUntil-now())/60000));
          fail(`Too many attempts. Try again in ${minutes} ${minutes===1?'minute':'minutes'}.`,429);
        }
        p.activationCodeVersion=codeVersion;
        const good=timingSafeEqual(Buffer.from(hash(body.code)),Buffer.from(codeVersion));
        if(good){p.teacher=true;p.activationAttempts=0;p.activationLockUntil=0;} else {p.activationAttempts=(p.activationAttempts||0)+1;if(p.activationAttempts>=5)p.activationLockUntil=now()+15*60000;}
        return good;
      }).then(good=>{if(!good)fail('Teacher activation code is incorrect.',403);});
      return {ok:true};
    }
    if (action === 'join') {
      const code=text(body.code,100).toUpperCase().replace(/[\s-]/g,'');
      const record = await read(`invite/${hash(code)}`);
      if(!record || record.expires<now())fail('Joining code is invalid or expired. Ask your teacher for a new one.');
      await mutate(record.teacherId, w=>{
        const c=find(w.classes,record.classId), s=find(c.students,record.studentId);
        if(s.archived || s.codeHash!==hash(code) || (s.userId && s.userId!==user.id))fail('This joining code is no longer available.',409);
        if(c.students.some(other=>other.id!==s.id && other.userId===user.id && !other.archived))fail('You already joined this class.',409);
        s.userId=user.id;s.joinedAt ||= now();
      });
      await updateProfile(user.id,p=>{p.memberships=[...new Set([...p.memberships,record.teacherId])].slice(-20);p.email=user.email;});
      return {ok:true};
    }
    if(action==='preferences') {
      await updateProfile(user.id,p=>{p.emailReminders=body.emailReminders===true;p.email=user.email;});return {ok:true};
    }
    if(action==='subscribe' || action==='unsubscribe') {
      const sub=body.subscription;
      if(action==='subscribe') {
        validateSubscription(sub);
        await updateAtomic(store, `push-owner/${hash(sub.endpoint)}`, ()=>({userId:null}), owner=>{owner.userId=user.id;});
      }
      await updateProfile(user.id,p=>{
        p.subscriptions=p.subscriptions.filter(s=>s.endpoint!==sub?.endpoint);
        if(action==='subscribe') {if(p.subscriptions.length>=5)fail('Up to five notification devices are supported.');p.subscriptions.push(sub);}
      });return {ok:true};
    }
    if(action==='match' || action==='submit') {
      const teacherId=text(body.teacherId), w=await workspace(teacherId), m=find(w.matches,body.matchId);
      const isTeacher=user.id===teacherId && (await profile(user.id)).teacher;
      if(action==='match') return {match:matchView(m,user.id,isTeacher)};
      const result=await mutate(teacherId, workspace=>{
        const match=find(workspace.matches,body.matchId);
        const actor=['A','B'].find(a=>match.players[a].userId===user.id);
        if(!actor)fail('This match is not assigned to you.',403);
        const previous=match.attempts.find(t=>t.turnId===body.turnId && t.actor===actor);
        if(previous)return {match:matchView(match,user.id),duplicate:true};
        if(match.cancelled || match.state.finished)fail('This match has ended.',409);
        if(body.version!==match.version || body.turnId!==`${match.id}:${match.version}`)fail('This turn has changed. Refresh the match.',409);
        const q=match.questions[match.version % match.questions.length];
        const submitted=text(body.answer,500);if(!submitted)fail('Choose or type an answer.');
        if(q.type!=='gap-fill' && !q.options.includes(submitted))fail('Choose one of the answer options.');
        const correct=normal(submitted)===normal(q.answer);
        const applied=applyTurn(match.gameType,match.state,{actor,move:body.move,emergence:body.emergence,target:body.target,answerCorrect:correct});
        match.state=applied.state;match.version++;match.updatedAt=now();
        match.attempts.push({actor,turnId:body.turnId,prompt:q.prompt,answer:q.answer,submitted,correct,explanation:q.explanation});
        const recipients=match.state.finished ? Object.values(match.players).map(p=>p.userId).concat(teacherId) : [match.players[currentTurn(match.gameType,match.state).actor].userId];
        queue(workspace,match,recipients,match.state.finished?'result':'turn');
        return {match:matchView(match,user.id),replay:applied.replay || null};
      });
      return {...result,dispatchTeacherId:teacherId};
    }
    await teacher(user);
    if(action==='class-create') {
      const name=text(body.name);if(!name)fail('Name your class.');
      return mutate(user.id,w=>{if(w.classes.length>=20)fail('This pilot supports up to 20 classes.');const c={id:randomUUID(),name,students:[]};w.classes.push(c);return {classId:c.id};});
    }
    if(action==='roster-add' || action==='roster-code') {
      const names=action==='roster-add' ? String(body.names||'').split('\n').map(n=>text(n,80)).filter(Boolean) : [];
      if(action==='roster-add' && (!names.length || names.length>100))fail('Add 1–100 names, one per line.');
      const w=await workspace(user.id), c=find(w.classes,body.classId);
      const students=action==='roster-add' ? names.map(name=>({id:randomUUID(),name,userId:null})) : [find(c.students,body.studentId)];
      const invites=[];
      for(const student of students){
        if(student.userId)fail('This student already has a linked account.');
        const code=randomBytes(9).toString('hex').toUpperCase();const expires=now()+7*86400000;
        const saved=await store.setJSON(`invite/${hash(code)}`,{teacherId:user.id,classId:c.id,studentId:student.id,expires},{onlyIfNew:true});
        if(!saved.modified)fail('Could not create a joining code. Retry.',409);
        invites.push({id:student.id,name:student.name,code,codeHash:hash(code),expires});
      }
      await mutate(user.id,ws=>{
        const cls=find(ws.classes,c.id);
        if(cls.students.length+names.length>200)fail('This pilot supports up to 200 students per class.');
        for(const invite of invites){
          let s=cls.students.find(s=>s.id===invite.id);
          if(!s){s={id:invite.id,name:invite.name,userId:null};cls.students.push(s);}
          if(s.userId)fail('This student has already joined.',409);
          s.codeHash=invite.codeHash;s.codeExpires=invite.expires;
        }
      });return {invites:invites.map(({codeHash,...v})=>v)};
    }
    if(action==='roster-remove')return mutate(user.id,w=>{
      const c=find(w.classes,body.classId),s=find(c.students,body.studentId);s.archived=true;s.codeHash=null;
      for(const m of w.matches)if(m.classId===c.id && Object.values(m.players).some(p=>p.studentId===s.id) && !m.state.finished)m.cancelled=true;
      return {ok:true};
    });
    if(action==='pool-save') {
      const name=text(body.name);if(!name)fail('Name the pool.');
      if(!Array.isArray(body.questions) || !body.questions.length || body.questions.length>200)fail('A cloud pool needs 1–200 questions.');
      const questions=body.questions.map((raw,i)=>{const q=cleanQuestion(raw),issues=validateQuestion(q);if(issues.length)fail(`Question ${i+1}: ${issues.join(' ')}`);return {...q,id:randomUUID(),tag:text(q.tag,80)};});
      return mutate(user.id,w=>{
        let pool=body.id?find(w.pools,body.id):null;
        if(pool && pool.version!==body.version)fail('This pool changed on another device. Refresh before saving.',409);
        if(!pool){if(w.pools.length>=20)fail('This pilot supports up to 20 cloud pools.');pool={id:randomUUID(),version:0};w.pools.push(pool);}
        Object.assign(pool,{name,questions,version:pool.version+1,updatedAt:now()});return {poolId:pool.id};
      });
    }
    if(action==='pool-delete')return mutate(user.id,w=>{find(w.pools,body.id);w.pools=w.pools.filter(p=>p.id!==body.id);return {ok:true};});
    if(action==='assign')return mutate(user.id,w=>{
      const c=find(w.classes,body.classId),pool=find(w.pools,body.poolId);
      if(!['penalty','turkey','sniper'].includes(body.gameType))fail('Choose a game.');
      const a=find(c.students,body.playerA),b=find(c.students,body.playerB);
      if(a.id===b.id || !a.userId || !b.userId || a.archived || b.archived || a.userId===b.userId)fail('Choose two different students who have joined this class.');
      if(w.matches.length>=50)fail('Export results and delete a completed match before creating another (50-match pilot limit).');
      const settings=gameSettings(body.gameType,body.settings);
      let questions=body.questionIds?.length ? pool.questions.filter(q=>body.questionIds.includes(q.id)) : pool.questions;
      if(!questions.length || questions.length>100)fail('Choose between 1 and 100 questions for a match.');
      questions=structuredClone(questions);
      // Shuffle once; every device and retry then uses the same question order.
      for(let i=questions.length-1;i>0;i--){const j=randomBytes(4).readUInt32BE()% (i+1);[questions[i],questions[j]]=[questions[j],questions[i]];}
      const players={A:{studentId:a.id,name:a.name,userId:a.userId},B:{studentId:b.id,name:b.name,userId:b.userId}};
      const m={id:randomUUID(),teacherId:user.id,classId:c.id,title:text(body.title)||`${c.name} · ${pool.name}`,gameType:body.gameType,settings,players,
        state:defaultState(body.gameType,settings),questions,version:0,attempts:[],createdAt:now()};
      w.matches.push(m);queue(w,m,[a.userId,b.userId],'assigned');return {matchId:m.id,dispatchTeacherId:user.id};
    });
    if(action==='cancel-match' || action==='delete-match')return mutate(user.id,w=>{
      const m=find(w.matches,body.matchId);
      if(action==='delete-match'){if(!m.state.finished && !m.cancelled)fail('End the active match before deleting its results.');w.matches=w.matches.filter(x=>x.id!==m.id);}
      else {m.cancelled=true;queue(w,m,Object.values(m.players).map(p=>p.userId),'cancelled');}
      return {ok:true,dispatchTeacherId:user.id};
    });
    if(action==='remind')return mutate(user.id,w=>{
      const m=find(w.matches,body.matchId);if(m.state.finished || m.cancelled)fail('This match has ended.');
      if(m.lastReminder && now()-m.lastReminder<3600000)fail('You can remind students once per hour.',429);
      m.lastReminder=now();queue(w,m,[m.players[currentTurn(m.gameType,m.state).actor].userId],'reminder');return {ok:true,dispatchTeacherId:user.id};
    });
    fail('Unknown classroom action.',404);
  }
  return {execute,dispatch,profile,updateProfile,ownsSubscription:async(uid,endpoint)=>(await read(`push-owner/${hash(endpoint)}`))?.userId===uid};
}

export function validateSubscription(sub) {
  let url;try{url=new URL(sub?.endpoint);}catch{fail('Invalid notification subscription.');}
  const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
  if(url.protocol!=='https:' || url.port || url.username || url.password || !allowed.some(host=>url.hostname===host || (host==='web.push.apple.com' && url.hostname.endsWith('.'+host))))fail('Unsupported push notification service.');
  if(url.href.length>2048 || !/^[A-Za-z0-9_-]{80,100}$/.test(sub?.keys?.p256dh||'') || !/^[A-Za-z0-9_-]{20,30}$/.test(sub?.keys?.auth||''))fail('Invalid notification keys.');
}
