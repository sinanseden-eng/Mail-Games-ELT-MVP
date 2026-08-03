# Mail Games ELT — 0.9B deployment and visual test notes

## Release

0.9B is the cinematic action pass for **Sniper Elite!**. It keeps the tested 0.9A rules and email workflow, while adding visible travelling shots and strong non-bloody hit reactions.

## Included

- tactical characters that emerge and aim from all four locations;
- direction-aware rifle poses;
- separate Player A and Player B firing beats;
- visible tracer/projectile travel;
- muzzle flash, recoil and subtle camera shake;
- clean vest impacts, stumble/drop reactions and a stronger zero-health finish;
- wall, roof and crate dust/debris when a prediction misses;
- trigger-click animation when an incorrect answer disables the shot;
- generated gunshot, click and impact audio;
- no blood or graphic injury.

## Database and Netlify

No new migration is required for 0.9B. The previously completed `007_sniper_game.sql` migration remains sufficient.

No new Netlify environment variable is required. Existing Gmail, secure-token, test-code and recipient-allowlist values are reused.

## Deploy

1. Extract `mailgames-elt-mvp-0.9b.zip`.
2. Replace the repository contents with everything inside the extracted `mailgames-elt-mvp-0.9b` folder.
3. Commit and push to GitHub.
4. Wait for Netlify to show **Published**.
5. Hard-refresh the site with **Ctrl+F5**.

## Focused acceptance test

Create a fresh Sniper Elite match and check these four outcomes:

1. **Hit:** correct answer and correct prediction. Confirm a muzzle flash, moving tracer, vest impact and clear reaction.
2. **Miss:** correct answer and wrong prediction. Confirm the tracer reaches the predicted location and creates environmental dust/debris.
3. **Disabled:** incorrect answer. Confirm the soldier emerges, the trigger clicks and no projectile appears.
4. **Double hit:** both predictions correct. Confirm both firing and hit reactions remain readable.

Also confirm:

- no blood or graphic wound is displayed;
- health still decreases by exactly one per successful prediction;
- Player B still cannot see Player A's choices before submitting;
- Player B receives the immediate replay;
- Player A receives the signed replay email;
- Penalty Shootout and Turkey Fight still route to their own scenes;
- replay works on both desktop and a phone-sized browser window.

## Verification performed

- JavaScript syntax check: passed
- Automated tests: 85 passed, 0 failed

The remaining work is the live Netlify visual test in real browsers.
