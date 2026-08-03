# Mail Games ELT 0.7.1a — Goalkeeper Landing Hotfix

This focused hotfix corrects the goalkeeper's final save pose.

## What changed

- The goalkeeper's shadow stays projected onto the pitch throughout the dive.
- The landing pose is solved from the lowest transformed limb point.
- The goalkeeper now settles onto the projected grass instead of finishing above it.
- The impact squash relaxes naturally after landing.
- All six goal zones are covered by an automated grounding test.

## Deployment

1. Replace the current repository files with the contents of this package.
2. Commit and wait for Netlify to publish.
3. Open a fresh replay or create a fresh match.
4. Test at least one high-corner save and one low-corner save.

No Supabase migration or new Netlify environment variable is required.
