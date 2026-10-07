import {verifyRequestOrigin} from '@netlify/identity';
import {getStore} from '@netlify/blobs';
import webpush from 'web-push';
import {createClassroomService, validateSubscription, fail} from './_shared/classroom-service.mjs';
import {sendEmailMessage} from './_shared/email.mjs';
import {getClassroomUser} from './_shared/classroom-auth.mjs';

// Conditional-write SDK versions may treat non-412 errors as successful. Reject
// failed writes at the transport boundary before they can acknowledge a turn.
export async function checkedBlobFetch(input, init) {
  const response = await fetch(input, init);
  const method = String(init?.method || input?.method || 'GET').toUpperCase();
  if (['PUT','POST','DELETE'].includes(method) && !response.ok && response.status !== 412) throw new Error('Classroom storage write failed.');
  return response;
}
export default async function handler(request, context) {
  const respond = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'private, no-store', 'Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  try {
    if (!['GET','POST'].includes(request.method)) return respond({error:'Method not allowed'},405);
    if (request.method === 'POST') {
      verifyRequestOrigin(request);
      if (!request.headers.get('content-type')?.startsWith('application/json')) fail('Use JSON for classroom requests.',415);
      if (Number(request.headers.get('content-length')) > 750000) fail('The question pool is too large.',413);
    }
    const env = name => Netlify.env.get(name) || '';
    const namespace = env('CLASSROOM_NAMESPACE');
    if (!/^[a-z0-9-]{3,60}$/.test(namespace)) return respond({error:'Classroom storage needs setup. Your existing email games are available.',setupRequired:'CLASSROOM_NAMESPACE'},503);
    if (context.deploy?.context !== 'production' && namespace === 'production') fail('Preview data must use a separate classroom namespace.',503);
    const user = await getClassroomUser();
    if (!user) return respond({error:'Sign in to open your classroom.'},401);
    const store = getStore({name:`classroom-${namespace}`,consistency:'strong',fetch:checkedBlobFetch});
    let service;
    service = createClassroomService({store,env,notify:async (event, profile) => {
      const url=new URL('/classroom.html',request.url);url.searchParams.set('match',event.matchId);url.searchParams.set('teacher',event.teacherId);
      const title=event.kind==='result'?'Match complete':event.kind==='assigned'?'New classroom match':event.kind==='cancelled'?'Match ended by your teacher':'Your turn is ready';
      let sent=false;
      for(const sub of profile.subscriptions) {
        try {
          validateSubscription(sub);
          if (!await service.ownsSubscription(event.userId,sub.endpoint)) continue;
          await webpush.sendNotification(sub,JSON.stringify({title,body:'Open Mail Games to view your match.',url:url.pathname+url.search,tag:`match-${event.matchId}`}),{
            TTL:3600,timeout:5000,vapidDetails:{subject:env('CLASSROOM_VAPID_SUBJECT') || new URL(request.url).origin,publicKey:env('CLASSROOM_VAPID_PUBLIC_KEY'),privateKey:env('CLASSROOM_VAPID_PRIVATE_KEY')}});
          sent=true;
        } catch(error) {
          if([404,410].includes(error.statusCode))await service.updateProfile(event.userId,p=>{p.subscriptions=p.subscriptions.filter(s=>s.endpoint!==sub.endpoint);});
        }
      }
      if(profile.emailReminders && profile.email && event.kind!=='cancelled') {
        const result=await sendEmailMessage({to:profile.email,subject:`Mail Games: ${title}`,text:`${title}. Sign in to see your match: ${url.href}\n\nYou enabled classroom email reminders. You can turn them off in the app.`,idempotencyKey:`classroom-${namespace}-${event.id}`});
        sent ||= Boolean(result.sent);
      }
      return {sent};
    }});
    let action='dashboard',body={};
    if(request.method==='POST') {
      const raw=await request.text();if(raw.length>750000)fail('The question pool is too large.',413);
      try {body=JSON.parse(raw);}catch{fail('Invalid request.');}
      action=body.action;
    }
    const result=await service.execute(user,action,body);
    const teacherId=result.dispatchTeacherId;
    delete result.dispatchTeacherId;
    if(teacherId)context.waitUntil(service.dispatch(teacherId).catch(()=>{}));
    return respond(result);
  } catch(error) {
    const status=Number(error.statusCode)|| (error.name==='AuthError'?403:500);
    if(status>=500)console.error('Classroom request failed',error.name,error.message);
    return respond({error:status>=500 && status!==503?'Could not save this request. Please retry.':error.message},status);
  }
}
export const config={path:'/api/classroom'};
