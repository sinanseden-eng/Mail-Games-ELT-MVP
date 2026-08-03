# Mail Games ELT 0.9H2B — Turn Boot Recovery

## Purpose
Fixes a secure-turn page that can remain on a black loading scene after a partial or cached deployment.

## Changes
- Forces a fresh `turn.js` and game-module load using versioned module URLs.
- Adds a 15-second timeout to `get-turn`.
- Adds a 12-second HTML boot watchdog if the module never initializes.
- Shows a visible Reload turn action instead of an indefinite black screen.
- Prevents a renderer startup exception from hiding the real error.
- Preserves every 0.9H2A penalty animation and perspective change.

## Deployment
Upload the patch contents into the repository root, preserving paths and replacing matching files. For the safest recovery, deploy the complete 0.9H2B ZIP. In Netlify, trigger a fresh deploy with cache cleared, then hard-refresh the turn page.

No Supabase migration or new environment variable is required.
