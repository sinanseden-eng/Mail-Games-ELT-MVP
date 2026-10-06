# Classroom app pilot

The `app-platform` branch adds `/classroom.html` alongside the existing email games. Keep it on a branch preview until a real teacher and two students complete the sign-in and device-notification checks below.

## Included

- Netlify Identity accounts, email confirmation, password recovery and invite callback handling using `@netlify/identity`.
- Teacher activation with a private server-side code; students cannot assign themselves teacher permissions through account metadata.
- Classes, roster entry, single-student joining codes with seven-day expiry, code replacement and roster removal.
- Cloud question pools with PDF, Word `.docx`, CSV, JSON and TXT import, answer-key review and manual editing. Browser pools can be copied to the teacher account. The original document stays on the device.
- Two-student match assignment, selected question subsets, starting football roles, game settings, student inbox and persisted alternating turns.
- Shared game rules: Turkey round limits and Counter damage, Sniper cinematic classroom replay, football draw / bounded sudden-death options.
- Teacher match monitoring, per-student accuracy, answer review, CSV results, cancellation and removal of completed results.
- Installable app shell; opt-in device push and email reminders. The inbox works independently of notification delivery.

## Hosting setup

Use the existing Netlify project with a branch deploy, not a second production app.

1. Enable Netlify Identity for the project in the Netlify dashboard. Keep email confirmation enabled. This cannot be enabled by the available project connector.
2. Set the following environment variables only in the appropriate deploy context, ensuring they include the **Functions** scope. On the current plan the dashboard uses All scopes for non-secret settings, and Builds / Functions / Runtime for secret settings; a Functions-only connector request returned success without persisting a variable, so verify each setting in the dashboard before deploying:
   - `CLASSROOM_NAMESPACE`: `app-platform-preview-v1` for the isolated pilot. Production must use a distinct value, such as `production`.
   - `CLASSROOM_TEACHER_CODE`: a private teacher activation code. If omitted, the existing `MAILGAMES_TEST_CODE` is used.
   - `CLASSROOM_VAPID_PUBLIC_KEY`, `CLASSROOM_VAPID_PRIVATE_KEY`: a matching Web Push VAPID key pair.
   - Optional `CLASSROOM_VAPID_SUBJECT`: site-owner contact URL or `mailto:` address. Defaults to the app origin.
3. The existing email provider configuration is reused only for users who explicitly enable email reminders. No email is needed for an ordinary app turn.
4. Build with `npm ci && npm run build`. Publish directory remains `.`, and the modern classroom function is routed at `/api/classroom`.
5. Callback emails that land at the site root are forwarded to the classroom callback handler without exposing tokens in query strings.

Preview and production must never point at the same Blob namespace. The function rejects an unset namespace and rejects `production` on non-production deploys. Never put Identity, provider or VAPID secrets in this repository.

## Data and concurrency

The classroom function hydrates JWT-only Identity sessions from the signed-in user's own authoritative account using the SDK's server-side account lookup. This is necessary when the SDK receives an operator token and its `/user` hydration falls back to JWT claims that omit `confirmedAt`. Missing confirmation data is never inferred from user metadata or auto-confirmed. Lookup failures return a retryable verification error; an authoritative unconfirmed account remains blocked and receives confirmation instructions.

Each teacher has an atomic workspace document in Netlify Blobs. Strong reads and ETag conditional writes keep game state, accuracy, question snapshots and notification outbox events in one commit. Concurrent retries of an already-accepted turn return the saved state without awarding points again. Invalid actors, moves, stale turn versions and unconfirmed users are rejected. Question explanations and answer keys are excluded from pending student turns.

Each assigned match snapshots the chosen questions and shuffles them once. Both players consume the same queue in turn order; questions repeat only after that queue is exhausted. Teacher pool edits do not affect existing matches.

The pilot is bounded to 20 classes, 200 roster entries per class, 20 pools of 200 questions, 50 retained matches and 100 questions per match. Finished-match deletion and CSV export provide retention controls. A larger school rollout should split workspace documents into database transactions and add administrative account/data deletion tooling.

Push endpoints are restricted to supported push-service hosts. Notifications contain a generic alert and an authenticated match link, never answers. Expired subscriptions are removed. Delivery is best effort through a persisted outbox; inbox state is authoritative. On previews, automatic scheduled retries are not available: the next mutation or a teacher reminder triggers another dispatch. No notifications are sent by the automated test suite.

## Validation and remaining release gate

`npm run check`, `npm test`, `npm run build`.

Automated tests cover full matches, equal-turn sudden death, defensive standoffs, counter damage, class ownership, joining codes, secret-choice redaction, server grading, pool snapshots, stale turns, simultaneous submissions, notification leasing and push-host validation. Browser checks use a mock Identity adapter and an in-memory instance of the real classroom service; they cover teacher enrolment through student play, actual Word import, cloud pool editing, results and mobile layout.

Before classroom-wide use, complete one deployed teacher + two-student journey using real confirmed accounts, then grant notification permission on a real supported phone and confirm delivery. Test account recovery emails against the final app URL. The mock checks do not substitute for these account/provider/device checks. Native App Store / Play Store packaging is a later delivery option; the current app is an installable web app.

## Deployment checkpoint — 4 October 2026

- Production game fixes are merged in PR #5 (`11ca723b81d5feec0082f3ed80566fa2ccaf73b9`) and deployed successfully as `6ac2ba324ca7cd0cf6d322ea`.
- Live browser checks passed: Sniper moving frames and scope replay, pause/resume, full-round completion, saved damage, repeated playback and reset; Turkey Counter damage and round-limit winner; football tie-setting persistence.
- The classroom preview is available at https://deploy-preview-4--mail-games-elt-mvp.netlify.app/classroom.html. Git integration built PR #4 automatically; after correcting the preview environment, a dashboard retry produced ready deploy `6ac2c0fa6b6fc949c2941e62` in context `deploy-preview`, branch `app-platform`.
- Identity is enabled. Open registration requires email confirmation (`disable_signup=false`, `autoconfirm=false`). The deployed Identity settings endpoint returns 200.
- Preview GET and same-origin POST `/api/classroom` correctly return 401 without an account; a foreign-origin POST returns 403. The manifest and service worker are served successfully. Authenticated Blob writes still require a real-account pilot test.
- Preview-only Blob namespace and matching VAPID settings are persisted and verified in the dashboard. The private VAPID key is marked secret. No secrets were committed, and no live invitation or reminder emails were sent in testing.
- PR #6 adds a small production-root authentication callback bridge for the pilot: recognized Identity hashes go to the fixed PR #4 preview, with tokens remaining in fragments. Ordinary game navigation is unchanged. The classroom branch omits the pilot marker, restoring same-origin callback routing when the app is eventually merged.
- Draft PR #4 remains unmerged until one real teacher and two students complete a match and phone push delivery is checked. Automated browser journeys used mocked Identity; they do not verify email delivery, real account recovery, or phone notifications.
- The generic deployment connector's earlier automatic approval rejection was respected. Preview rebuilding and Identity activation used the Netlify dashboard after explicit user approval.

## Football replay update — 6 October 2026

The classroom football replay now uses the supplied goalkeeper and shooter models with the fixed TV angle, directional/centre saves, glove attachment, a 1.8 m deep fine-strand net and adjustable sag. Practice, local shootout and current email replay share this renderer. Model downloads are about 3.5 MB combined; the existing 2D replay remains available when 3D is unavailable. See `docs/FOOTBALL_3D.md` for behavior and validation. Scoring, question grading, independent secret choices and the real-account/device release gate are unchanged.
