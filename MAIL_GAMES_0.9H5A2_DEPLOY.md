# MAIL GAMES 0.9H5A2 — CLEAN PLAYER CUTOUT HOTFIX

## Fixed
- Removes the second-goal/goal-within-goal artifact during penalty animation.
- Replaces the active striker and goalkeeper images with clean transparent cutouts.
- Keeps the broadcast background as the only stadium and goal layer.
- Preserves player scale, realistic ball, six marked target coordinates, and six net-sag profiles.
- Uses a new 0.9H5A2 module chain to prevent H5A1 assets from returning from cache.

## Deployment
No Supabase migration or new Netlify variable is required. Upload the complete build or apply the H5A1 to H5A2 patch, then clear the Netlify cache and deploy.
