# QueueLens Verification

All commands in this log were run from `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

## Final verification snapshot

- Date: `2026-05-19` (moderation caution guidance polish)
- Playtest version observed: `v0.0.1.27` (dev server on port `5678`)
- Subreddit: `r/queuelens_dev`
- Playtest URL: `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens`
- Browser path used: Cursor IDE Browser MCP (`cursor-ide-browser`) plus manual moderator clicks where automation failed

## Files changed

- `src/shared/moderationGuidance.ts` (caution reasons and suggested moderator note derivation)
- `src/client/components/ModerationGuidance.tsx` (Reasons to be cautious and Suggested moderator note UI)
- `src/client/components/DecisionCard.tsx` (wire guidance panels into review card)
- `src/tests/moderationGuidance.test.ts` (caution, note, no Reddit action, no em dash in key strings)
- `src/client/components/StatePanel.tsx`, `SignalList.tsx`, fixtures (replace em dashes in user-facing copy)
- `VERIFICATION.md` (this update)

## Commands run

- `npm run typecheck`: passed
- `npm test`: passed (see Local automated verification below)
- `npm run build`: passed
- `git status --short`

## Final case matrix (fresh E2E run)

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

- Status: `pass` (handler + tests); permanent per-target menu disable `not supported by Devvit`
- Analysis post used in prior live retry: `https://www.reddit.com/r/queuelens_dev/comments/1ti44ff/queuelens_analysis/`
- Menu visibility (Devvit platform, re-checked in repo):
  - `devvit.json` schema (`@devvit/shared-types/schemas/config-file.v1.json`) allows only: `label`, `description`, `forUserType`, `location`, `endpoint`, `postFilter` (`none` | `currentApp`)
  - No `disabled`, `enabled`, `commentFilter`, or dynamic per-post predicates in this repo’s Devvit packages
  - Reddit may briefly grey the item client-side, but reopening the menu shows it clickable again; there is no supported permanent disabled state for specific posts
  - `postFilter: "currentApp"` would show the item **only** on this app’s custom posts (inverse of QueueLens needs), so it was **not** used
  - Post menu description (static): `Open a QueueLens review card. Not available on QueueLens analysis posts.`
- Handler guard (authoritative):
  - Detection runs **before** `submitCustomPost` via `isQueueLensAnalysisPostTarget()` in `src/server/queueLensMenuGuards.ts`
  - Primary signal: existing Redis session key `queuelens:{postId}` on the analysis post
  - Fallback: post title `QueueLens analysis` plus `queuelens` author or `/queuelens_analysis/` permalink
  - Response: `showToast` with exact text `QueueLens cannot analyze QueueLens analysis posts.` (`appearance: neutral`); no `navigateTo`; no `submitCustomPost`; no `redis.set` / `redis.expire`
- Live UI (prior pass, unchanged):
  - Menu item still visible and may appear briefly disabled, then clickable again on reopen (platform limitation; not faked in app code)
  - Click did not create a new analysis post (URL stayed on `1ti44ff`)
  - Toast text was not screenshot-captured in browser automation
- Automated coverage: `pass`
  - `src/tests/menuAnalyze.test.ts`: toast returned; `submitCustomPost`, `redis.set`, and `redis.expire` not called for analysis targets
  - `src/tests/menuAnalyze.test.ts`: blocks when `redis.get('queuelens:t3_analysis')` returns a session without calling `getPostById`
  - `src/tests/queueLensMenuGuards.test.ts`: session-key and metadata detection paths

## Recursive-analysis guardrail

- Permanent per-target disabled menu state: **not supported** (confirmed from repo schema; no `disabled` / dynamic predicates)
- Static menu warning: post item description states analysis posts are not available
- Handler block + toast: **pass** (authoritative; toast `QueueLens cannot analyze QueueLens analysis posts.`)
- Live UI: menu item remains visible; brief client greying is not a reliable disable

## Moderation caution guidance (2026-05-19)

- **Reasons to be cautious**: derived from partial runs, limited evidence, non-high confidence, unavailable context, demo rules, synthetic/test markers, ambiguous civility, and a fixed note that QueueLens never auto-moderates.
- **Suggested moderator note**: plain-English advisory text with copy button; uses AI `moderatorNoteDraft` when present, otherwise a deterministic fallback. No Devvit or Reddit mutation APIs are called from this UI.
- **Em dash cleanup**: user-facing strings in `src/`, fixtures, and this doc use colons, commas, or hyphens instead of U+2014.
- **Automated coverage**: `src/tests/moderationGuidance.test.ts` (bare-domain spam, personal-info, ambiguous civility, partial validation warnings).

## Local automated verification (this continuation pass)

- `npm run typecheck`: passed
- `npm test`: passed (see git commit output for file/test counts)
- `npm run build`: passed

## Bugs found

- UX limitation (platform): Devvit cannot hide **Analyze with QueueLens** on QueueLens analysis posts; handler toast is the supported mitigation
- E2E blockers (unchanged from prior passes):
  - Embedded Devvit webview automation did not reliably open the Case 4 raw-context drawer even though the control was visible
  - Devvit toast on recursive-analysis guardrail is hard to capture in browser automation

## Fixes made

- Added moderation caution guidance panels and tests; removed em dashes from user-facing copy in `src/`
- Clarified post menu description and recursive-analysis toast text (handler guard unchanged; no fake disabled state)
- Documented that Devvit does not support permanent per-target menu disabling in this repo

## Submission readiness

- QueueLens is **close, but not fully submission-ready from this artifact set alone**.
- Reason:
  - Cases 1–3: **pass** in fresh live run
  - Case 4: core live blocker cleared; cautious analysis verified live
  - Case 4 raw-context drawer open-state was not re-captured in this specific fixture because of embedded webview automation limits
  - Case 5: handler guard and tests **pass**; Reddit menu item remains visible on analysis posts until Devvit supports per-target hiding

## What remains

1. Optionally obtain a manual click-through screenshot of the Case 4 raw-context drawer in its open state on `1ti44ff`.
2. Optionally capture the Case 5 live toast screenshot on an analysis post (handler text is fixed in code/tests).
3. Remove the NSFW tag from the Case 3 fixture if it is still present for clean demos.
4. If Reddit/Devvit add per-target menu `disabled` or hide predicates, apply them to QueueLens analysis posts; until then rely on handler guard + menu description + toast.
