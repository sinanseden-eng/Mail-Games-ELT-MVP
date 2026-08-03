# Mail Games ELT — 0.9H1 to 0.9H2 Patch

Use the complete 0.9H2 ZIP for normal deployment. The patch ZIP is provided only for reviewing or applying the changed files to an unchanged 0.9H1 project.

## Changed files

- `penalty-perspective.mjs`
- `penalty-visuals.mjs`
- `shootout-scene.mjs`
- `package.json`
- `README.md`
- `index.html`
- `tests/penalty-realistic-consistency-0.9h2.test.mjs`
- `docs/PENALTY_REALISTIC_CONSISTENCY_0.9H2.md`
- `MAIL_GAMES_0.9H2_DEPLOY.md`

## Apply

1. Back up the deployed 0.9H1 project.
2. Copy the patch files over the matching 0.9H1 paths.
3. Run `npm run check` and `npm test`.
4. Deploy and hard-refresh.

No Supabase migration or new Netlify variable is required.
