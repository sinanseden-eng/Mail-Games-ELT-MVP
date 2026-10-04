// Identity emails can return to the live site's root during the classroom pilot.
// Keep callbacks in the URL fragment; they must never become query parameters.
export function authCallbackTarget({hash, hostname}, pilot = false) {
  if (!/(?:^#|&)(?:confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/.test(hash)) return null;
  const base = pilot && hostname === 'mail-games-elt-mvp.netlify.app'
    ? 'https://deploy-preview-4--mail-games-elt-mvp.netlify.app/classroom.html'
    : '/classroom.html';
  return base + hash;
}

if (typeof location !== 'undefined' && typeof document !== 'undefined') {
  const pilot = document.querySelector('script[data-classroom-pilot="true"]') !== null;
  const target = authCallbackTarget(location, pilot);
  if (target) location.replace(target);
}
