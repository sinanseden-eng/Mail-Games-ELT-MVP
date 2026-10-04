// Identity emails may return to the site root. Preserve the callback for the app.
if (/(?:^#|&)(?:confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/.test(location.hash)) {
  location.replace('/classroom.html' + location.hash);
}
