# Mail Games ELT — 0.9C1 deployment and visual test notes

0.9C1 is a visual hotfix for the empty scope problem reported in 0.9C. It does not change game logic or stored data.

## Deploy

1. Keep the working 0.9B and 0.9C ZIP files as rollback copies.
2. Replace the deployed site files with the complete 0.9C1 package, or apply the 0.9C → 0.9C1 patch.
3. Wait for Netlify to report **Published**.
4. Hard refresh the game page.
5. Create a fresh Sniper Elite match.

No new Supabase migration or Netlify environment variable is required.

## Essential visual test

Test one successful shot and one miss. During each scope sequence confirm that:

- the village remains visible inside the circular lens;
- on a hit, the rival soldier is visible near the crosshair;
- the first-person muzzle flash and tracer are visible;
- TAGGED or MISS appears before the reaction-camera cut;
- the clean hit reaction and health update still occur;
- Penalty Shootout and Turkey Fight still route correctly.
