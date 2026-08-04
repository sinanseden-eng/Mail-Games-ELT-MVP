# MAIL GAMES 0.9H5A1 — PLAYER ASSET AND BALL OWNERSHIP HOTFIX

## What changed
- Replaces the active oversized opaque striker and goalkeeper cards with transparent broadcast-scale cutouts.
- Removes the ball-containing low goalkeeper images from the active replay map.
- Uses ball-free dive poses for high and low reactions.
- Enforces strict player width, height, rotation, and scale caps.
- Keeps the dedicated ball renderer as the only source of a football in the replay.
- Preserves the broadcast camera, six exact marked target coordinates, and six net-sag profiles.

## Deployment
No Supabase migration or new Netlify environment variable is required. Upload the complete project or apply the 0.9H5A to 0.9H5A1 patch, then clear the Netlify cache and deploy.
