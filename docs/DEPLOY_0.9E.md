# Mail Games ELT — 0.9E deployment and visual test notes

0.9E is a presentation-only Penalty Shootout update built on the stable 0.9D package.

## Deploy

1. Keep the current 0.9D ZIP as a rollback copy.
2. Replace the deployed site files with the complete 0.9E package, or apply the 0.9D → 0.9E patch.
3. Wait for Netlify to show **Published**.
4. Hard-refresh the site with `Ctrl + F5`.

No Supabase migration and no new Netlify environment variable are required.

## Required live test

Complete three fresh penalty rounds:

### Goal

- The replay begins with a wide stadium view.
- The camera moves behind the striker before contact.
- The boot reaches the ball; the ball does not launch by itself.
- Ball cam follows the stored trajectory.
- Goal cam shows the ball entering the correct zone and deforming the net.
- The scoreboard changes only after the action is visible.

### Save

- The goalkeeper dives toward the stored zone.
- Glove cam shows visible hand-to-ball contact.
- The ball changes direction after contact.
- The keeper lands and the save result appears afterward.

### Miss

- The ball remains visible while travelling wide or over the bar.
- Miss cam follows the continuation instead of cutting directly to the result.
- The result appears after the miss is clear.

## Regression test

- Confirm Player B still cannot see Player A's secret penalty choice before submitting.
- Open one Turkey Fight match and one Sniper Elite match to confirm their canvases and routing are unchanged.
- Test one signed penalty replay email as well as the immediate Player B replay.
- On a phone, confirm the camera label and speed readout do not cover the ball or result banner.
