# QueueLens Verification

All commands in this log were run from `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

## Final verification snapshot

- Date: `2026-05-19` (Review Desk postData session bridge, manual smoke test **live pass**)
- Playtest subreddit: `r/queuelens_dev`
- Playtest URL: `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens`
- Review Desk URL shape: `https://www.reddit.com/r/queuelens_dev/comments/<deskId>/queuelens_review_desk/` (optional `?analysisSessionId=<uuid>` for debug; not relied on live)
- `analysisSessionId` behavior: created per Analyze in Redis at `queuelens:analysis:{analysisSessionId}`; **primary bridge** is Review Desk postData keyed by moderator user id (`reddit.mergePostData`); client and `GET /api/analyze` resolve postData first, then URL query, then hash (fallback/debug only)
- Live query-param failure (recorded): top-level Reddit URL preserved `?analysisSessionId=...`, but the embedded Devvit webview loaded `splash.html?token=...` without the session id and failed closed. postData bridge is the fix; do not treat query params as the primary mechanism.
- postData bridge live smoke test: **live pass** (signed-in moderator, manual). Fixture: ambiguous civility post `t3_1ti3shk`. Review card loaded; no missing-session error; no new `queuelens_analysis` post. Prior agent playwright failure was unsigned-in browser / private subreddit, not an app regression.
- Live E2E Cases 1-5 (full fixture matrix): **pending** (smoke test does not replace Cases 1-5)
- Automated checks before commit: `npm run typecheck`, `npm test`, `npm run build`

## Worker 2 audit reconciliation (repo vs checklist)

| Check | Status | Evidence |
| --- | --- | --- |
| `menuAnalyze.test.ts` does not assert `queuelens:{deskPostId}` handoff | **pass** | Asserts `not.toHaveBeenCalledWith('queuelens:t3_desk', ...)`; sessions use `queuelens:analysis:*` |
| `analyzeTarget.test.ts` covers missing / expired / mismatch / happy path | **pass** | 7 tests: no param, missing context, missing session, legacy key not read, desk mismatch, two sessions, comment pipeline |
| Docs mention `queuelens:analysis:{sessionId}` | **pass** | `README.md`, `02_ARCHITECTURE.md`, `03_GUARDRAILS.md`, this file |
| Docs do not describe shared desk handoff as active flow | **pass** | Architecture describes per-analysis sessions; legacy desk key only in guard/tests |
| `/api/analyze` fails closed without `analysisSessionId` | **pass** | 400 + `MISSING_ANALYSIS_SESSION_ERROR` |
| `/api/analyze` fails closed when session missing/expired | **pass** | 404 + same error; malformed payload treated as missing |
| `/api/analyze` validates `deskPostId` and `subredditName` | **pass** | 400 on mismatch; requires Devvit `postId` and `subredditName` (fail closed if absent) |
| Missing Devvit `postId` / `subredditName` | **fail closed** | No test proving Devvit omits these on valid playtest webview; aligned with `/api/init` pattern |

## Files changed (Review Desk postData session bridge)

- `src/server/analysisSession.ts` (create/read/validate `queuelens:analysis:{analysisSessionId}`, TTL 3600)
- `src/server/reviewDesk.ts` (`storeAnalysisSessionBridgeOnReviewDeskPost`; optional query on navigate URL for debug)
- `src/server/routes/menuAnalyze.ts` (unique session per Analyze; merge postData bridge; navigate to Review Desk)
- `src/server/routes/analyzeTarget.ts` (resolve `analysisSessionId` from postData then query; fail closed; require Review Desk context)
- `src/client/analysisSession.ts`, `src/client/api.ts` (resolve session id from postData then URL; pass to API)
- `src/shared/analysisSession.ts` (postData bridge helpers; query/hash fallback)
- `src/tests/analysisSession.test.ts`, `src/tests/analyzeTarget.test.ts`, `src/tests/clientAnalysisSession.test.ts`
- `src/tests/menuAnalyze.test.ts`, `src/tests/reviewDesk.test.ts`
- `devvit.json` (post menu description for Review Desk)
- `README.md`, `02_ARCHITECTURE.md`, `03_GUARDRAILS.md`, `VERIFICATION.md`

## Commands run (Review Desk pass)

- `npm run typecheck`: passed
- `npm test`: passed (71 tests, 13 files)
- `npm run build`: passed
- `npm run dev`: existing session at `v0.0.1.61`; duplicate start failed `EADDRINUSE :5678`
- `git status --short`

## Review Desk live E2E (Cases 1-5, this pass)

| Case | Fixture / focus | `analysisSessionId` in URL | Correct target in card | No new `queuelens_analysis` post | Status (this pass) |
| --- | --- | --- | --- | --- | --- |
| 1 | Bare-domain spam | not verified | not verified | not verified | **not live-verified** |
| 2 | Comment target | not verified | not verified | not verified | **not live-verified** |
| 3 | Fake personal-info | not verified | not verified | not verified | **not live-verified** |
| 4 | Ambiguous civility | not verified | not verified | not verified | **not live-verified** |
| 5 | Recursive guard on Review Desk | n/a (blocked) | n/a | no new session/post expected | **not live-verified** (handler + unit tests **pass**) |

Screenshot paths (this pass): **none** (live E2E not run).

### Manual steps to complete live Review Desk E2E

1. Run `npm run dev` locally until Devvit prints `Playtest ready` and a version (for example `v0.0.1.28+`).
2. Open `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens` in Chrome as a **moderator** on `queuelens_dev`.
3. For Cases 1, 3, 4: open or create the fixture post, post menu, **Analyze with QueueLens**.
4. Confirm navigation lands on **QueueLens Review Desk** (title `QueueLens Review Desk`, slug `queuelens_review_desk`), not a new `queuelens_analysis` post per analyze.
5. Re-run Analyze on the same fixture: confirm the **same** Review Desk URL (reuse, no second desk post).
6. Case 2: repeat on a test comment; confirm Review Desk loads with comment target context.
7. Case 5: on the Review Desk post, open post menu, **Analyze with QueueLens**; confirm toast `QueueLens cannot analyze QueueLens Review Desk posts.` and no navigation.

### Prior fixture URLs (legacy per-analyze model, still useful as content sources)

- Case 3 fixture: `https://www.reddit.com/r/queuelens_dev/comments/1ti1n4o/queuelens_e2e_fake_personalinfo_fixture/?playtest=queuelens`
- Case 4 fixture: `https://www.reddit.com/r/queuelens_dev/comments/1ti3shk/queuelens_e2e_ambiguous_civility_fixture/?playtest=queuelens`
- Case 5 prior legacy analysis post: `https://www.reddit.com/r/queuelens_dev/comments/1ti44ff/queuelens_analysis/`

After manual rerun, record the Review Desk permalink (for example `/r/queuelens_dev/comments/<id>/queuelens_review_desk/`) in this file.

## Final case matrix (prior live E2E, legacy per-analyze posts)

### Case 1: bare-domain spam

- Status: `pass` (completed earlier in fresh run; not re-run)
- Fixture:
  - title: `[QueueLens E2E] Bare-domain spam fixture`
  - body: `cheapwidgets.example cheapwidgets.example cheapwidgets.example`
- Screenshot paths:
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-review-ui-open.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-decision-and-quality.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-quality-checks-final.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-raw-context-open.png`

### Case 2: comment target flow

- Status: `pass` (completed earlier in fresh run; not re-run)
- Notes: comment moderation menu showed `Analyze with QueueLens`; QueueLens analysis review card opened with evidence, quality checks, and raw context for comment target.

### Case 3: fake personal-info

- Status: `pass` (manual blocker cleared; fresh analysis verified)
- Fixture post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1ti1n4o/queuelens_e2e_fake_personalinfo_fixture/?playtest=queuelens`
- Fresh analysis post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1ti30ny/queuelens_analysis/?playtest=queuelens`
- Target id in raw context: `t3_1ti1n4o`
- Verified behaviors:
  - Fresh analysis page opened with live session
  - Review card rendered (summary, priority **high**, confidence **high**, suggested action **remove**)
  - Partial-result warning: `Removed unsupported evidence snippet for source 'reported_content'.`
  - Redacted email and phone evidence rendered in review surfaces (`[redacted-email]`, `[redacted-phone]`); raw context `bodyText` also redacted (no raw `test.user@example.com` or `555-0100` in drawer JSON)
  - Deterministic email/phone signals rendered
  - Analysis quality section rendered
  - No automatic enforcement action taken (suggested action only; footer states final decision stays with moderator)
  - Raw context drawer opened (`Hide raw context` visible)
- Caveats recorded:
  - Partial result: unsupported `reported_content` evidence snippet removed (expected guardrail behavior)
  - Suggested action was **remove** with **high** confidence and **high** priority despite synthetic E2E fixture text (behavior note for demo review, not a redaction failure)
  - Fixture post may still carry an accidental NSFW tag from earlier automation probing (`Remove NSFW tag` available in mod menu)
- Screenshot paths:
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-review-card.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-review-card-user.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-raw-context-open.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-raw-context-open-user.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-redacted-evidence.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-deterministic-signals.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-evidence-and-signals.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-evidence-quality.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-quality-checks.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-fixture-post.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case3-mod-menu-queuelens.png`

### Case 4: ambiguous civility

- Status: `live pass` with one artifact caveat
- Fixture:
  - title: `[QueueLens E2E] Ambiguous civility fixture`
  - body: `[QueueLens E2E] Ambiguous civility fixture. This reply is annoying and unhelpful, but I am not sure it clearly breaks a rule.`
- Fixture post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1ti3shk/queuelens_e2e_ambiguous_civility_fixture/`
- Fresh analysis post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1ti44ff/queuelens_analysis/`
- Verified behaviors:
  - Fixture was created manually in signed-in Chrome because Reddit's rich-text submit body was not reliable under automation
  - Post moderation menu showed `Analyze with QueueLens`
  - Fresh QueueLens analysis post was created for the fixture
  - Review card rendered with a cautious outcome:
    - suggested action: `needs_manual_review`
    - review priority: `medium`
    - confidence: `medium`
  - Evidence rendered with grounded snippets from the fixture
  - Analysis quality section rendered (`Schema valid`, `Evidence validated`, `No automatic action taken`, `Raw context available`)
  - Deterministic signals section rendered
  - No automatic Reddit moderation action was taken; footer still states final moderation stays with the moderator
- Caveat:
  - The raw-context control was visible live, but the embedded Devvit webview did not allow a reliable automated click-through to capture the Case 4 drawer in its open state. This remains an inference from:
    - the shared `RawContextDrawer` client component (`src/client/components/RawContextDrawer.tsx`)
    - the live Case 3 capture where the same control opened and showed `Hide raw context`
- Screenshot paths:
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-fixture-post.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-mod-menu-queuelens.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-review-card-after-wait.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-evidence-panel-2.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-quality-checks.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-deterministic-signals.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case4-raw-context-open.png` (control visible; open-state capture not obtained)

### Case 5: recursive-analysis guardrail

- Status: `pass` (handler + tests); live re-run on Review Desk **not completed** in Review Desk validation pass (see manual steps above)
- Prior live retry used a legacy per-analyze post: `https://www.reddit.com/r/queuelens_dev/comments/1ti44ff/queuelens_analysis/`
- Menu visibility (Devvit platform, re-checked in repo):
  - `devvit.json` schema (`@devvit/shared-types/schemas/config-file.v1.json`) allows only: `label`, `description`, `forUserType`, `location`, `endpoint`, `postFilter` (`none` | `currentApp`)
  - No `disabled`, `enabled`, `commentFilter`, or dynamic per-post predicates in this repo’s Devvit packages
  - Reddit may briefly grey the item client-side, but reopening the menu shows it clickable again; there is no supported permanent disabled state for specific posts
  - `postFilter: "currentApp"` would show the item **only** on this app’s custom posts (inverse of QueueLens needs), so it was **not** used
  - Post menu description (static): `Open a QueueLens review card. Not available on the QueueLens Review Desk post.`
- Handler guard (authoritative):
  - Detection runs **before** desk resolution via `isQueueLensAnalysisPostTarget()` in `src/server/queueLensMenuGuards.ts`
  - Primary signal: existing Redis session key `queuelens:{postId}` on the Review Desk or legacy analysis post
  - Fallback: Review Desk title `QueueLens Review Desk` (permalink `/queuelens_review_desk/`) or legacy title `QueueLens analysis` (`/queuelens_analysis/`)
  - Response: `showToast` with exact text `QueueLens cannot analyze QueueLens Review Desk posts.` (`appearance: neutral`); no `navigateTo`; no `submitCustomPost`; no handoff `redis.set` / `redis.expire`
- Live UI (prior pass on legacy analysis post; re-verify on Review Desk):
  - Menu item still visible and may appear briefly disabled, then clickable again on reopen (platform limitation; not faked in app code)
  - Toast text was not screenshot-captured in browser automation
- Automated coverage: `pass`
  - `src/tests/menuAnalyze.test.ts`: toast returned; `submitCustomPost`, `redis.set`, and `redis.expire` not called for blocked targets
  - `src/tests/menuAnalyze.test.ts`: blocks when `redis.get('queuelens:t3_desk')` returns a session without calling `getPostById`
  - `src/tests/queueLensMenuGuards.test.ts`: session-key, Review Desk metadata, and legacy analysis metadata paths
  - `src/tests/reviewDesk.test.ts`: desk create, reuse, stale pointer recovery

## Recursive-analysis guardrail

- Permanent per-target disabled menu state: **not supported** (confirmed from repo schema; no `disabled` / dynamic predicates)
- Static menu warning: post item description states the Review Desk post is not available for analyze
- Handler block + toast: **pass** in unit tests (toast `QueueLens cannot analyze QueueLens Review Desk posts.`)
- Live UI: menu item remains visible on Review Desk and legacy analysis posts; brief client greying is not a reliable disable

## Moderation caution guidance (2026-05-19)

- **Reasons to be cautious**: derived from partial runs, limited evidence, non-high confidence, unavailable context, demo rules, synthetic/test markers, ambiguous civility, and a fixed note that QueueLens never auto-moderates.
- **Suggested moderator note**: plain-English advisory text with copy button; uses AI `moderatorNoteDraft` when present, otherwise a deterministic fallback. No Devvit or Reddit mutation APIs are called from this UI.
- **Em dash cleanup**: user-facing strings in `src/`, fixtures, and this doc use colons, commas, or hyphens instead of U+2014.
- **Automated coverage**: `src/tests/moderationGuidance.test.ts` (bare-domain spam, personal-info, ambiguous civility, partial validation warnings).

## Local automated verification (postData bridge docs pass)

- `npm run typecheck`: passed
- `npm test`: passed (73 tests, 13 files; includes `analyzeTarget.test.ts` 8, `menuAnalyze.test.ts` 8, `analysisSession.test.ts` 7, `clientAnalysisSession.test.ts` 4)
- `npm run build`: passed
- `git status --short`: docs + postData bridge source (see working tree)

## Review Desk switch (2026-05-19)

- Code: one reusable **QueueLens Review Desk** custom post per subreddit; per-analysis sessions at `queuelens:analysis:{analysisSessionId}` (about 1h TTL); registry at `queuelens:desk:{subredditName}`
- **Primary session bridge**: Review Desk postData keyed by moderator user id (`mergePostData` on analyze; client and API read postData first). Avoids cross-moderator last-write-wins. Same-user rapid analyzes may overwrite that user's pointer (acceptable for V1).
- `menuAnalyze` may append `?analysisSessionId=...` to the navigate URL for debugging only; does not write a shared `queuelens:{deskPostId}` handoff
- Opening Review Desk without a resolvable session id fails closed with a clear message (no pipeline on unknown targets)
- URL fallbacks: client and server also accept query and hash `analysisSessionId` (debug/fallback; query path **failed live** when used as primary)
- Stale pointer: if `queuelens:desk:{subreddit}` points at a missing or wrong-shape post, desk is recreated and pointer updated
- Live E2E Cases 1-5 on Review Desk navigation: **not live-verified** in full matrix; postData smoke test tracked separately below

## Bugs found

- UX limitation (platform): Devvit cannot hide **Analyze with QueueLens** on the Review Desk or legacy analysis posts; handler toast is the supported mitigation
- E2E blockers (unchanged from prior passes):
  - Embedded Devvit webview automation did not reliably open the Case 4 raw-context drawer even though the control was visible
  - Devvit toast on recursive-analysis guardrail is hard to capture in browser automation

## Fixes made (Review Desk pass)

- Switched menu flow to a reusable Review Desk per subreddit (`src/server/reviewDesk.ts`); legacy `QueueLens analysis` posts remain blocked
- Clarified post menu description and recursive-analysis toast text (handler guard unchanged; no fake disabled state)
- Documented that Devvit does not support permanent per-target menu disabling in this repo

## Session bridge decision record (query vs postData)

- **Query param as primary**: **failed live**. Browser address bar kept `?analysisSessionId=<uuid>` after menu navigation, but the Devvit webview request was `splash.html?token=...` without the session id; Review Desk failed closed.
- **postData bridge (primary)**: `menuAnalyze` writes `{ [userId]: { analysisSessionId, createdAt } }` on the Review Desk post; client (`getAnalysisSessionIdFromWindow`) and `analyzeTarget` read postData before query/hash.
- **Query/hash (fallback/debug only)**: still implemented in `src/shared/analysisSession.ts` and covered by unit tests; not relied on for production navigation.
- **Rejected**: shared `queuelens:{deskPostId}` Redis handoff (cross-moderator last-write-wins).

## postData bridge live smoke test

Run once as a signed-in moderator on `r/queuelens_dev` with playtest enabled:

1. `npm run dev` until **Playtest ready**.
2. Open `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens`.
3. Analyze one normal fixture post via post menu **Analyze with QueueLens**.
4. Confirm navigation lands on **QueueLens Review Desk** (not a new `queuelens_analysis` post).
5. Confirm the review card loads (not "No active QueueLens review session").
6. Open raw context; confirm `targetId` matches the analyzed fixture post.
7. Record result below.

| Check | Expected | Result |
| --- | --- | --- |
| Review Desk loads review card | card visible | **live pass** |
| Raw context `targetId` | matches analyzed post | **live pass** (`t3_1ti3shk`) |
| No new `queuelens_analysis` post | reuse Review Desk only | **live pass** |

Manual smoke test (`2026-05-19`, signed-in mod): **Analyze with QueueLens** navigated to **QueueLens Review Desk**; review card rendered without missing-session error. Raw context showed `targetId: t3_1ti3shk` (ambiguous civility fixture). No new `queuelens_analysis` post appeared.

Agent playwright attempt (same day, earlier): **blocked** (not signed in; private subreddit). That failure did not reproduce the app bug; embedded Devvit webview content is not visible to unsigned automation.

## Submission readiness

- QueueLens is **not fully submission-ready** until Review Desk live E2E (Cases 1-5) is completed by a signed-in moderator.
- postData session bridge: **live pass** (manual smoke test); full Cases 1-5 matrix still **pending**.
- Ready now:
  - Review Desk server flow and guards: **pass** (typecheck, 51 tests, build)
  - Prior live behavior for analysis content (Cases 1-4) on legacy `queuelens_analysis` posts: **pass** with documented caveats
  - Case 5 handler + tests on Review Desk and legacy shapes: **pass**
- Blockers for submission sign-off:
  - Full Cases 1-5 live matrix on Review Desk not completed (postData smoke test passed on ambiguous civility fixture only)
  - Case 5 live toast on Review Desk not captured in this pass
  - Devvit menu item remains visible on Review Desk until platform supports per-target hide

## What remains

1. Run the manual Review Desk E2E steps above for Cases 1-5; update this file with Review Desk permalink and per-case `live pass` / `fail`.
3. Optionally re-capture Case 4 raw-context drawer open state on the Review Desk.
4. Optionally capture Case 5 live toast on the Review Desk post.
5. Remove the NSFW tag from the Case 3 fixture if still present.
6. If Reddit/Devvit add per-target menu hide or `disabled`, apply to Review Desk and legacy analysis posts.
