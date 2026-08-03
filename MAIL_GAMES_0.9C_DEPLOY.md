# Mail Games ELT — 0.9C deployment and visual test notes

## Release

0.9C adds the hybrid camera requested for Sniper Elite: wide tactical context, a brief firing-soldier scope point of view, then a clear target-reaction camera. It does not alter the tested scoring, concealment, database or email workflow.

## Database and Netlify

No new Supabase migration is required. The previously completed `007_sniper_game.sql` migration remains sufficient.

No new Netlify environment variable is required. Existing Gmail, secure-token, test-code and recipient-allowlist settings are reused.

## Deploy

1. Keep the working 0.9B ZIP as a rollback copy.
2. Extract `mailgames-elt-mvp-0.9c.zip`.
3. Replace the repository contents with everything inside the extracted `mailgames-elt-mvp-0.9c` folder.
4. Commit and push to GitHub.
5. Wait for Netlify to show **Published**.
6. Hard-refresh with **Ctrl+F5**.

## Focused acceptance test

Create a fresh Sniper Elite match and test:

1. **Active hit:** confirm wide view, Player A scope POV, recoil/tracer, then a clear clean target reaction.
2. **Active miss:** confirm the scope centres on the predicted cover and the impact camera shows environmental debris.
3. **Disabled shot:** confirm the scope still appears, displays the locked-trigger state and fires no projectile.
4. **Player B shot:** confirm a separate Player B scope POV appears rather than reusing Player A's camera.
5. **Controls:** pause during a scope view, resume, then test **Skip to result**.
6. **Mobile:** confirm the canvas, scope circle and replay-control buttons fit a phone-sized browser.

Also confirm:

- no blood or graphic injury is displayed;
- health changes by exactly one only for a successful active prediction;
- Player B cannot see Player A's choices before submitting;
- immediate and signed replays show the same stored outcome;
- Penalty Shootout and Turkey Fight still open their own scenes.

## Automated verification

Run:

```bash
npm run check
npm test
```

The remaining step after automated checks is the live Netlify browser test.

## Verification completed for this package

- JavaScript syntax verification: passed
- Automated tests: 88 passed, 0 failed
