# QueueLens Verification

All commands in this log were run from `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

## Final verification snapshot

- Date: `2026-05-19` (Review Desk switch validation)
- Playtest subreddit: `r/queuelens_dev`
- Playtest URL: `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens`
- Live E2E in this pass: **not completed** (see Review Desk live E2E below)
- Automated checks in this pass: `npm run typecheck`, `npm test` (51 tests), `npm run build` all **pass**
- Dev server: `npm run dev` started but did not reach `Playtest ready` in the agent environment within ~2 minutes (likely blocked on Devvit CLI auth or an existing playtest session)
- Reddit fetch attempt: `GET` playtest URL returned **403 Forbidden** without a signed-in moderator session
- Browser path: no Cursor IDE Browser MCP in this workspace; prior live artifacts remain under `manual-artifacts\queuelens-live-2026-05-19\` (per-analyze post model)

## Files changed (Review Desk switch)

- `src/server/reviewDesk.ts` (get or create Review Desk, desk pointer `queuelens:desk:{subredditName}`, stale recovery)
- `src/server/routes/menuAnalyze.ts` (navigate to Review Desk; handoff `queuelens:{deskPostId}`, TTL 3600)
- `src/server/queueLensMenuGuards.ts` (block Review Desk and legacy analysis posts)
- `src/tests/reviewDesk.test.ts`, `src/tests/menuAnalyze.test.ts`, `src/tests/queueLensMenuGuards.test.ts`
- `devvit.json` (post menu description for Review Desk)
- `README.md`, `02_ARCHITECTURE.md`, `VERIFICATION.md`

## Commands run (Review Desk pass)

- `npm run typecheck`: passed
- `npm test`: passed (51 tests, 10 files)
- `npm run build`: passed
- `npm run dev`: started; playtest URL not confirmed ready in agent session
- `git status --short`

## Review Desk live E2E (Cases 1-5, this pass)

| Case | Fixture / focus | Review Desk navigation | Status (this pass) |
| --- | --- | --- | --- |
| 1 | Bare-domain spam | Expected: same subreddit **QueueLens Review Desk** post, not a new `queuelens_analysis` post | **not live-verified** (prior pass on legacy model; see matrix below) |
| 2 | Comment target | Expected: Review Desk opens with comment target in handoff | **not live-verified** |
| 3 | Fake personal-info | Expected: Review Desk + redaction behavior | **not live-verified** (prior fixture URLs still valid for manual rerun) |
| 4 | Ambiguous civility | Expected: cautious outcome on Review Desk | **not live-verified** |
| 5 | Recursive guard on Review Desk | Menu visible OK; toast blocks; no new desk/handoff | **not live-verified** (handler + unit tests **pass**) |

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

## Local automated verification (Review Desk pass)

- `npm run typecheck`: passed
- `npm test`: passed (51 tests: `reviewDesk.test.ts` 6, `menuAnalyze.test.ts` 6, `queueLensMenuGuards.test.ts` 7, plus existing suites)
- `npm run build`: passed

## Review Desk switch (2026-05-19)

- Code: one reusable **QueueLens Review Desk** custom post per subreddit; handoff at `queuelens:{deskPostId}` (1h TTL); registry at `queuelens:desk:{subredditName}`
- `menuAnalyze` navigates to `toAbsoluteRedditUrl(desk.permalink)` after `redis.set` / `redis.expire`; does not call `submitCustomPost` per analyze
- Stale pointer: if `queuelens:desk:{subreddit}` points at a missing or wrong-shape post, desk is recreated and pointer updated
- Live E2E Cases 1-5 on Review Desk navigation: **not live-verified** in agent pass; automated coverage **pass**

## Bugs found

- UX limitation (platform): Devvit cannot hide **Analyze with QueueLens** on the Review Desk or legacy analysis posts; handler toast is the supported mitigation
- E2E blockers (unchanged from prior passes):
  - Embedded Devvit webview automation did not reliably open the Case 4 raw-context drawer even though the control was visible
  - Devvit toast on recursive-analysis guardrail is hard to capture in browser automation

## Fixes made (Review Desk pass)

- Switched menu flow to a reusable Review Desk per subreddit (`src/server/reviewDesk.ts`); legacy `QueueLens analysis` posts remain blocked
- Clarified post menu description and recursive-analysis toast text (handler guard unchanged; no fake disabled state)
- Documented that Devvit does not support permanent per-target menu disabling in this repo

## Submission readiness

- QueueLens is **not fully submission-ready** until Review Desk live E2E (Cases 1-5) is completed by a signed-in moderator.
- Ready now:
  - Review Desk server flow and guards: **pass** (typecheck, 51 tests, build)
  - Prior live behavior for analysis content (Cases 1-4) on legacy `queuelens_analysis` posts: **pass** with documented caveats
  - Case 5 handler + tests on Review Desk and legacy shapes: **pass**
- Blockers for submission sign-off:
  - No live evidence that **Analyze with QueueLens** navigates to **QueueLens Review Desk** (not per-analyze posts) after this switch
  - Case 5 live toast on Review Desk not captured in this pass
  - Devvit menu item remains visible on Review Desk until platform supports per-target hide

## What remains

1. Run the manual Review Desk E2E steps above; update this file with Review Desk permalink and per-case `live pass` / `fail`.
2. Optionally re-capture Case 4 raw-context drawer open state on the Review Desk.
3. Optionally capture Case 5 live toast on the Review Desk post.
4. Remove the NSFW tag from the Case 3 fixture if still present.
5. If Reddit/Devvit add per-target menu hide or `disabled`, apply to Review Desk and legacy analysis posts.
