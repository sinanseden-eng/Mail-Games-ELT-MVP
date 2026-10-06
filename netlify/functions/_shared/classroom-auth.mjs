import {getUser, admin} from '@netlify/identity';
import {fail} from './classroom-service.mjs';

export async function getClassroomUser({getSession=getUser, getAccount=id=>admin.getUser(id)}={}) {
  const user=await getSession();
  if (!user || user.confirmedAt) return user;
  // The SDK's verified JWT fallback omits confirmedAt. In Functions its
  // Identity token is an operator token, so /user may not hydrate that record.
  // Read only the signed-in user's authoritative account; never auto-confirm it.
  let account;
  try {account=await getAccount(user.id);} catch {
    fail('We couldn’t check your email confirmation. Please try again shortly.',503);
  }
  if (!account || account.id!==user.id) fail('We couldn’t verify your account. Please try again shortly.',503);
  return account;
}
