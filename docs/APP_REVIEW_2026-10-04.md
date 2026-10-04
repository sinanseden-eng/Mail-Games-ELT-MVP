# App review and next release

## Shipped in this change

- Football rear frame depth halved (0.23 to 0.115 pitch units), with deeper resting mesh sag, roof sag and impact deformation. Camera and target positions are unchanged. The ball remains attached to the same animated net surface.
- Teacher Studio accepts text-based PDF, Word DOCX, CSV, JSON and plain text. The parsers run in the browser using self-hosted, pinned PDF.js and Mammoth dependencies. No original documents are sent to a conversion API.
- Review every extracted question before saving. Missing/invalid answers prevent saving selected questions; questions can be corrected or excluded. Numbered questions, A–E options, inline answers and separate letter answer keys are supported. Complex worksheets require manual correction. Scanned PDFs need OCR; legacy DOC needs conversion to DOCX. Limits: 10 MB, 100 PDF pages, 500 imported questions per batch.
- Named browser-local pools, active pool selection, editing, JSON backup/restore, and duplicate skipping. Sample questions create a separate pool instead of replacing teacher work. Existing games consume the active pool through the existing storage contract. Email matches keep their launch snapshot and retain the 100-question limit.
- Fixed Teacher Studio navigation alias, repeat submission in local games, delayed callbacks surviving resets/navigation, and missing private handoff for Player B. Turkey round state is committed before animation so leaving during playback does not lose a completed round.
- Corrected misleading Turkey move/streak copy and inactive football shot caption. Improved mobile Teacher Studio header and import review space.

## Review findings still requiring product decisions

| Area | Finding | Recommendation |
| --- | --- | --- |
| Turkey Fight | Both players can defend forever; no round limit. Counter prevents damage but does not counterattack. | Add a teacher-set round cap with a higher-health winner; either rename Counter or design and test actual return damage. |
| Turkey / Sniper presentation | Classroom demos use older visuals while email replay pages use richer renderers. | Reuse the richer scenes in classroom play, with skip/pause and proper animation cleanup. |
| Football scoring | Five kicks each can end in a draw. | Offer a teacher choice: accept draws or a capped sudden-death extension. |
| Question selection | Active pool is shared by new local turns; questions can repeat. No teacher-selected subset yet. | Snapshot the selected pool/subset at match creation, shuffle without repetition, and define behaviour when it runs out. |
| Learning value | Correctness unlocks moves, but there is no saved learning report. | Store question-level attempts and show a short correction/review screen at match end. |
| Classroom platform | Teachers' pools remain browser-local; no roster or account-based match inbox. | Build authenticated teacher/student web-app flows and database ownership before classroom-wide rollout. |
| Email pilot | Protected test mode is configured; actual inbox delivery was not exercised during this review. | Keep the existing private pilot until an authorized end-to-end delivery test is complete. |

## Agreed product direction: app-based matches

Start with an installable, responsive web app. Teacher chooses a class, two students, question pool/subset, starting shooter/keeper and match length. Students see assigned matches in their own inbox. The server reveals only their current question and permitted choices; hidden rival choices stay private. After both submit, both see the same replay/result, roles alternate, and the next turn opens until completion. Email becomes an optional notification channel.

Implementation milestones:
1. Teacher/student authentication, class rosters and database-owned pools.
2. Teacher match creation and student match inbox, reusing existing game engine.
3. Server-authoritative turns, ownership checks, reconnect/retry and duplicate-submit protection; optional live updates.
4. Installable web-app shell and optional notifications, then a small classroom pilot.
5. Learning reports and cross-device tests before broader launch. Native app-store packaging can follow if needed.

This release does not implement accounts, an app inbox, push notifications, OCR or the new gameplay rules.

## Validation

232 automated tests passed, plus syntax checks. Browser checks exercised actual DOCX/PDF imports, image-only PDF rejection, invalid-answer correction, edit and pool preservation, studio navigation, private turn handoff, double submission, reset during animation and phone layouts. Football idle and impact images were inspected. Function email sends were not used in these checks.

Run `npm ci && npm run build` before serving: the build copies browser readers and licenses into ignored `vendor/`. Netlify runs the same build command. Do not deploy a bare source archive without building it.
