# Mail Games ELT 0.9H3 — Motion Realism Pass

## What changed

- Faster, more natural ball acceleration while preserving the exact stored shot destination.
- Goalkeeper anticipation, takeoff, full extension and landing phases.
- Short motion-matched photo transitions for striker and keeper movement.
- Subtle ball-attached motion blur, with no pointer or detached trail.
- Save-contact compression and restrained full-goal net ripple.
- Existing 0.9H2C natural goalkeeper camera and 0.9H2B boot recovery remain intact.

## Deployment

1. Upload the complete project, or apply the 0.9H2C → 0.9H3 patch at repository root.
2. Replace matching files while preserving paths.
3. In Netlify, choose **Clear cache and deploy site**.
4. Hard-refresh the turn and replay pages.

No Supabase migration is required. No new Netlify environment variable is required.

## Live test checklist

- Test all six shot zones from striker and keeper perspectives.
- Test a wrong-way goal, correct-zone save, wide miss and bar/crossbar miss.
- Confirm the ball reaches the stored target with no helper graphic.
- Confirm the keeper visibly anticipates and then dives in the stored direction.
- Confirm repeated replay does not change sides or introduce a loading screen.
- Check desktop and 390–430 px mobile layouts.
- Check reduced-motion mode and sound timing.
