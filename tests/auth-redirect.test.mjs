import test from 'node:test';
import assert from 'node:assert/strict';
import {authCallbackTarget} from '../auth-redirect.mjs';

test('pilot Identity callbacks return to the fixed classroom preview with fragment intact', () => {
  for (const key of ['confirmation_token','recovery_token','invite_token','email_change_token','access_token']) {
    const hash = `#${key}=test-only&redirect_to=https://example.com&expires_in=3600`;
    const target = authCallbackTarget({hostname:'mail-games-elt-mvp.netlify.app',hash},true);
    const url = new URL(target);
    assert.equal(url.origin,'https://deploy-preview-4--mail-games-elt-mvp.netlify.app');
    assert.equal(url.pathname,'/classroom.html');
    assert.equal(url.search,'');
    assert.equal(url.hash,hash);
  }
});

test('preview callbacks and the eventual production app keep their own origin', () => {
  assert.equal(authCallbackTarget({hostname:'deploy-preview-4--mail-games-elt-mvp.netlify.app',hash:'#confirmation_token=test-only'},true),'/classroom.html#confirmation_token=test-only');
  assert.equal(authCallbackTarget({hostname:'mail-games-elt-mvp.netlify.app',hash:'#recovery_token=test-only'}),'/classroom.html#recovery_token=test-only');
});

test('ordinary game navigation and lookalike callback names do not redirect', () => {
  for (const hash of ['','#home','#sniper','#football','#fake_confirmation_token=test-only','#screen=confirmation_token=test-only']) {
    assert.equal(authCallbackTarget({hostname:'mail-games-elt-mvp.netlify.app',hash},true),null);
  }
});
