import test from 'node:test';
import assert from 'node:assert/strict';
import {getClassroomUser} from '../netlify/functions/_shared/classroom-auth.mjs';
import {createClassroomService} from '../netlify/functions/_shared/classroom-service.mjs';

test('confirmed full accounts and signed-out sessions do not need an account lookup',async()=>{
  const user={id:'teacher',confirmedAt:'2026-10-06'};
  const getAccount=()=>assert.fail('Unexpected lookup');
  assert.equal(await getClassroomUser({getSession:async()=>user,getAccount}),user);
  assert.equal(await getClassroomUser({getSession:async()=>null,getAccount}),null);
});
test('JWT-only sessions use the own-account record, and metadata cannot confirm an email',async()=>{
  const session={id:'student',userMetadata:{confirmedAt:'forged'}};
  const account={id:'student',email:'student@example.test'};
  const user=await getClassroomUser({getSession:async()=>session,getAccount:async id=>{assert.equal(id,'student');return account;}});
  assert.equal(user.confirmedAt,undefined);
  const service=createClassroomService({store:{}});
  await assert.rejects(service.execute(user,'dashboard'),e=>e.statusCode===403&&/Confirm your email/.test(e.message));
});
test('failed or mismatched lookups remain blocked without claiming the email is unconfirmed',async()=>{
  for(const getAccount of [async()=>{throw new Error('Identity unavailable');},async()=>({id:'someone-else',confirmedAt:'2026-10-06'})])
    await assert.rejects(getClassroomUser({getSession:async()=>({id:'student'}),getAccount}),e=>e.statusCode===503&&!/Confirm your email before/.test(e.message));
});
test('the real SDK operator-token fallback can hydrate a confirmed account in Functions',async()=>{
  const originalFetch=globalThis.fetch,originalContext=globalThis.netlifyIdentityContext;
  const id='11111111-1111-4111-8111-111111111111',calls=[];
  globalThis.netlifyIdentityContext={url:'https://identity.example.test/.netlify/identity',token:'operator-token-fixture',user:{sub:id,email:'teacher@example.test'}};
  globalThis.fetch=async(url,options)=>{
    calls.push(String(url));
    assert.equal(options.headers.Authorization,'Bearer operator-token-fixture');
    if(String(url).endsWith('/user'))return Response.json({msg:'Not a user token'},{status:401});
    assert.equal(String(url),`https://identity.example.test/.netlify/identity/admin/users/${id}`);
    return Response.json({id,email:'teacher@example.test',confirmed_at:'2026-10-06T20:00:00Z',user_metadata:{full_name:'Teacher'}});
  };
  try {
    const user=await getClassroomUser();
    assert.equal(user.id,id);assert.equal(user.confirmedAt,'2026-10-06T20:00:00Z');assert.equal(user.name,'Teacher');
    assert.equal(calls.length,2);
  } finally {globalThis.fetch=originalFetch;if(originalContext===undefined)delete globalThis.netlifyIdentityContext;else globalThis.netlifyIdentityContext=originalContext;}
});
