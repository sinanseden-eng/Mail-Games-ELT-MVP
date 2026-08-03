# Mail Games ELT — 0.9E1 deployment and test notes

0.9E1 is a focused hotfix for the broken penalty replay in 0.9E.

## Deploy

1. Keep your working 0.9D package as a rollback copy.
2. Replace the deployed files with the complete 0.9E1 package, or apply the 0.9E → 0.9E1 patch.
3. Wait for Netlify to report **Published**.
4. Hard-refresh the site with **Ctrl + F5**.

No Supabase migration or new Netlify environment variable is required.

## Essential live test

Run one active goal attempt and confirm this sequence:

1. The wide scene remains visible during the run-up.
2. The behind-the-ball view appears.
3. A large ball is visible at the striker's foot.
4. The leg reaches and passes the ball with a contact flash.
5. The ball travels toward the selected zone.
6. The goalkeeper completes the dive.
7. For a goal, the ball reaches the net and the net visibly moves before the result caption.

Also test one save and one inactive-shot miss.

## Verification performed

- JavaScript syntax validation passed.
- 100 automated tests passed, including a new full-motion render test at the exact kick and goal frames.
- Static canvas renders were generated successfully at boot contact and goal impact.

The final confirmation is still the live Netlify test in your browser.
