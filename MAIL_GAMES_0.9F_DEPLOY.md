# Mail Games ELT 0.9F — Deployment and Visual Test

## Deploy

1. Keep your working 0.9E1 package as a rollback copy.
2. Replace the deployed project with the complete 0.9F package.
3. Commit and push, then wait for Netlify to report **Published**.
4. Refresh the game with `Ctrl + F5`.

No Supabase migration or new Netlify environment variable is required.

## Visual test

Run one fresh penalty replay for each result:

### Goal
- Realistic stadium establishing shot appears.
- Striker visibly progresses through run-up, plant, contact, and follow-through.
- Cinematic layer fades after the kick so programmed ball flight remains visible.
- Net animation occurs, accompanied by the brief Net Cam impact treatment.

### Save
- Goalkeeper reaction insert advances through the dive sequence.
- The existing glove contact and ball deflection remain visible.
- Save Cam appears briefly without replacing the result logic.

### Miss
- The kick sequence still completes.
- The programmed miss trajectory remains visible.
- Miss Cam appears only at impact time.

Also verify Penalty, Turkey Fight, and Sniper routing after deployment.
