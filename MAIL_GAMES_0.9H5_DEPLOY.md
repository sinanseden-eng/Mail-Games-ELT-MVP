# MAIL GAMES 0.9H5 — PENALTY BROADCAST FINALIZATION

## Scope

0.9H5 finalizes the fixed broadcast-camera penalty replay without changing the camera or the six user-marked target coordinates.

## What changed

- Keeps the exact six 0.9H4D shot centres unchanged.
- Smooths the diagonal taker approach and anchors every frame to the plant foot.
- Adds a visible plant phase, restrained boot compression, and small natural turf flecks.
- Stages the goalkeeper through anticipation, push-off, extension, and landing.
- Starts the goalkeeper's committed movement immediately after the strike.
- Gives the photographed ball speed-aware attached blur instead of a ghost ball or pointer.
- Adds glove compression, natural save deflection, frame rebounds, over-bar continuation, and deeper net settling.
- Delays the result banner until the physical outcome is readable.
- Synchronizes boot, keeper takeoff, glove/net/frame impact, settling, and result audio.
- Removes coloured celebration confetti from the broadcast frame.
- Uses uniquely named 0.9H5 entry, scene, physics, visual, and audio modules.

## Unchanged

- The uploaded broadcast camera
- The six user-marked target coordinates
- Match scoring and question logic
- Supabase schema
- Gmail delivery and signed links
- Turkey Fight Mail
- Sniper Elite

## Deployment

No Supabase migration and no new Netlify environment variable are required.

1. Extract the complete ZIP or patch.
2. Copy the project contents into the GitHub repository root.
3. Preserve all file paths and new `0.9h5` filenames.
4. Commit and push.
5. In Netlify, use **Clear cache and deploy site**.
6. Hard-refresh the live turn and replay pages.

## Required live checks

- Test all six shot targets.
- Test left, centre, and right keeper moves at both heights.
- Test one goal, save, frame miss, over-bar miss, and wide miss.
- Replay the same result twice.
- Check desktop and narrow mobile widths.
- Confirm that result text waits until after the physical outcome.

## Automated validation

- JavaScript syntax checks passed.
- 194 automated tests passed with 0 failures.
