# MAIL GAMES 0.9H4B — BROADCAST AUTHORITY HOTFIX

## Root cause fixed
0.9H4A still used 0.9.23 entry and import URLs. It also allowed the active penalty visual pack to initialize from the older penalty-0.9f striker image. This could leave the previous images and movement renderer in control.

## What changed
- New unique entry files: turn-0.9h4b.js, replay-0.9h4b.js and shootout-0.9h4b.js.
- New unique scene and visual modules.
- New unique broadcast background filename based on the uploaded reference photograph.
- Selection and replay both initialize from the broadcast plate.
- HTML, JavaScript and module cache headers now require revalidation.

## Deployment
Use the complete ZIP for this correction. Replace the repository root contents, then choose **Clear cache and deploy site** in Netlify. No Supabase migration or new environment variable is required.
