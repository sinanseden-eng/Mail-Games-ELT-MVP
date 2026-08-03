# Mail Games ELT 0.6G — two-inbox Gmail test

1. Complete `docs/GMAIL_API_SETUP_0.6G.md`.
2. Set `MAIL_TEST_ALLOWED_RECIPIENTS` to the two test addresses.
3. Redeploy Netlify.
4. Confirm the health endpoint reports `emailProvider: "gmail"` and `email: true`.
5. Open `/#teacher`, create a new Mail Penalty Shootout match, and use the two approved addresses.
6. Player A opens the Gmail-delivered link, answers, chooses a move, and submits.
7. Player B receives the next message, answers, chooses the keeper move, and submits.
8. Confirm the outcome, score, role switch, and next email.
9. If delivery fails, use Teacher Studio's Email delivery recovery panel and inspect the provider error.

No Supabase migration is required for 0.6G.
