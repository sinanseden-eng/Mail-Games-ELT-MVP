# Mail Games ELT — 0.9D deployment and visual test notes

0.9D is a presentation-only update built on the stable 0.9C1 package.

## Deploy

1. Keep the working 0.9C1 ZIP as a rollback copy.
2. Replace the deployed site files with the complete 0.9D package, or apply the 0.9C1 → 0.9D patch.
3. Wait for Netlify to report **Published**.
4. Hard refresh the game page.
5. Create a fresh Sniper Elite match.

No Supabase query or Netlify environment-variable change is required.

## Essential visual test

Test one hit, one miss, and one disabled shot. Confirm that:

- the target moves into the reticle instead of appearing instantly centred;
- the lock brackets tighten and the lock percentage reaches 100%;
- the muzzle flash, projectile core, tracer, and pressure ring are visible;
- recoil kicks and then settles without blanking the lens;
- a hit produces a clear vest-sensor flash and stagger with no blood;
- a miss strikes the predicted environment;
- the bolt-cycle sound follows an active shot;
- Penalty Shootout and Turkey Fight still open normally.

## Build verification

- JavaScript syntax checks passed.
- 94 automated tests passed with 0 failures.
- The final scope timing and sound balance still require the live Netlify visual test.
