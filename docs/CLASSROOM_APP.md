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
2. Set the following **function** environment variables only in the appropriate deploy context:
   - `CLASSROOM_NAMESPACE`: `app-platform-preview-v1` for the isolated pilot. Production must use a distinct value, such as `production`.
   - `CLASSROOM_TEACHER_CODE`: a private teacher activation code. If omitted, the existing `MAILGAMES_TEST_CODE` is used.
   - `CLASSROOM_VAPID_PUBLIC_KEY`, `CLASSROOM_VAPID_PRIVATE_KEY`: a matching Web Push VAPID key pair.
   - Optional `CLASSROOM_VAPID_SUBJECT`: site-owner contact URL or `mailto:` address. Defaults to the app origin.
3. The existing email provider configuration is reused only for users who explicitly enable email reminders. No email is needed for an ordinary app turn.
4. Build with `npm ci && npm run build`. Publish directory remains `.`, and the modern classroom function is routed at `/api/classroom`.
5. Callback emails that land at the site root are forwarded to the classroom callback handler without exposing tokens in query strings.

Preview and production must never point at the same Blob namespace. The function rejects an unset namespace and rejects `production` on non-production deploys. Never put Identity, provider or VAPID secrets in this repository.

## Data and concurrency

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
- The complete classroom branch has 249 passing tests and a successful browser journey with mocked authentication. Draft PR #4 remains unmerged.
- The real site's Identity settings endpoint returns 404. Identity must be enabled before real sign-in tests.
- The generic Netlify deployment connector was rejected by automatic approval for the app preview because it cannot specify a branch in its tool arguments. No app preview was uploaded. The documented build API accepts an explicit `branch=app-platform`, but using that deployment connection still requires approval. Do not reuse production authorization to bypass this rejection.
- Preview-only Blob namespace and VAPID settings have been configured. No secrets were committed, and no live invitation or reminder emails were sent in testing.
