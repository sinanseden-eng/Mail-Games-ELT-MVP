# Mail Games 0.9H2A Deployment

## Purpose

This is a presentation-only hotfix for the goalkeeper penalty replay. It removes the remaining white/cartoon impact flash before the realistic result camera.

## Deploy

Upload the complete project or copy the extracted 0.9H2 → 0.9H2A patch contents over an existing untouched 0.9H2 repository, preserving paths.

No Supabase migration or new Netlify environment variable is required.

## Live checks

1. Open a keeper turn and resolve a goal.
2. Confirm the incoming ball remains visible.
3. Confirm there is no full-screen white flash, radial burst or comic contact star.
4. Confirm the replay cuts directly to the realistic final goal camera.
5. Repeat for save and miss.
6. Replay the same result twice and confirm timing remains identical.
7. Check desktop and mobile.

## Automated validation

Run:

```bash
npm run check
npm test
```
