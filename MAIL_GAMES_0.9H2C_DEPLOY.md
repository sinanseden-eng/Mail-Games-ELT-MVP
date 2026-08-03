# Mail Games ELT 0.9H2C — Natural Keeper Replay

## Purpose

Replaces the remaining keeper-view helper graphic with one natural photographic ball-and-dive replay.

## Changes

- The active goalkeeper replay now remains in one photographic goalmouth.
- The stored keeper direction selects the visible set-to-dive frame sequence.
- The stored shot coordinate independently controls the visible football path.
- Goals, saves and misses continue naturally after contact.
- The detached wireframe net, side marker, pointer, flash and static look-back result camera are no longer used by the keeper replay.
- Replay again and the final still preserve the same action camera.
- 0.9H2B secure-turn boot recovery and cache protection remain enabled.

## Deployment

For a repository already running 0.9H2B, extract the patch and copy its contents into the repository root, preserving paths and replacing matching files.

Because 0.9H2C changes browser modules, trigger a Netlify deploy with cache cleared and hard-refresh both the turn and replay pages.

For an older or uncertain repository, deploy the complete 0.9H2C ZIP instead of the patch.

## Live test

Test at least:

- one wrong-way goal;
- one correct-direction save;
- one miss;
- left and right shot/dive combinations;
- Replay again;
- desktop and mobile cropping.

The key acceptance check is that the football and the diving goalkeeper remain in the same photographic scene, with no helper net appearing at any point.

No Supabase migration or new environment variable is required.
