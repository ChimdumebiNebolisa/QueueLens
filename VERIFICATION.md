# QueueLens Verification

All commands in this log were run from `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

## Final verification snapshot

- Date: `2026-05-19`
- Playtest version observed: `v0.0.1.54`
- Subreddit: `r/queuelens_dev`
- Playtest URL: `https://www.reddit.com/r/queuelens_dev/?playtest=queuelens`
- Browser path used:
  - Codex Chrome extension for live navigation and inspection
  - Manual click / manual visual confirmation where Chrome interaction or embedded-card extraction was not reliable

## Files changed

- `devvit.json`
- `src/server/routes/menuAnalyze.ts`
- `src/tests/menuAnalyze.test.ts`

## Commands run

- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git status --short`

## Code changes verified in this pass

- Moderator action handoff now uses an absolute Reddit URL built from `post.permalink`.
- Missing or invalid targets now produce visible toasts instead of failing silently.
- Post and comment menu entries are registered separately in `devvit.json`.
- Recursive analysis of QueueLens-generated analysis posts is blocked with toast:
  - `QueueLens analysis posts cannot be analyzed.`
- Regression coverage was added for:
  - absolute handoff URL
  - missing-target toast
  - recursive-analysis guardrail toast

## Final case matrix

### Case 1: bare-domain spam

- Status: `pass`
- Fixture:
  - title: `[QueueLens E2E] Bare-domain spam fixture`
  - body: `cheapwidgets.example cheapwidgets.example cheapwidgets.example`
- Observed result:
  - QueueLens analysis custom post opened.
  - Review card rendered.
  - Exact evidence snippets rendered.
  - Deterministic repeated-domain signal rendered.
  - Analysis quality checks rendered.
  - Raw context drawer opened.
- Screenshot paths:
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-review-ui-open.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-decision-and-quality.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-quality-checks-final.png`
  - `C:\Users\Chimdumebi\DevvitTemp\manual-artifacts\queuelens-live-2026-05-19\case1-raw-context-open.png`

### Case 2: comment target flow

- Status: `fail / unstable`
- Fixture used:
  - existing live spam comment under `https://www.reddit.com/r/queuelens_dev/comments/1tg594v/test_post/?playtest=queuelens`
  - comment text included `https://spam.example` and `https://spam.example/extra`
- Final targeted attempt:
  - the comment-level moderation button was present and opened
  - the visible live menu showed comment moderation actions such as `Mark as Spam` and `Show mod label`
  - the QueueLens item was present in assigned DOM / async content for the comment action row, but it did not appear as a visible selectable live menu item in the final targeted attempt
  - because the QueueLens comment action did not become visibly selectable in that final attempt, the review UI was not live-proven for a comment target
- Observed result:
  - comment-level registration exists after the `devvit.json` split
  - live visibility of the QueueLens comment action is still inconsistent
  - comment-target analysis is not yet proven end to end
- Screenshot paths:
  - no new stable screenshot was captured for the failing final targeted attempt

### Case 3: fake personal-info

- Status: `pass with behavior concern`
- Fixture:
  - title: `[QueueLens E2E] Fake personal-info fixture`
  - body: `[QueueLens E2E] Fake personal-info fixture. Contact me at test.user@example.com or 555-0100. This is synthetic test data only.`
- Analysis custom-post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1thtj6m/queuelens_analysis/`
- Observed result:
  - QueueLens review card visible: `yes`
  - Redacted placeholders visible: `yes`
  - Raw unredacted `test.user@example.com` visible in QueueLens review UI: `no`
  - Raw unredacted `555-0100` visible in QueueLens review UI: `no`
  - Analysis quality visible: `yes`
  - Raw context availability visible: `yes`
- Concern to record:
  - the result was labeled high priority / high confidence with suggested action `remove`
  - that may be too aggressive for clearly synthetic fixture text
  - this is a product-behavior concern, not a redaction failure
- Screenshot paths:
  - no local screenshot file path was captured in this workspace for case 3

### Case 4: ambiguous civility

- Status: `pass with evidence caveat`
- Fixture:
  - title: `[QueueLens E2E] Ambiguous civility fixture`
  - body: `[QueueLens E2E] Ambiguous civility fixture. This reply is annoying and unhelpful, but I am not sure it clearly breaks a rule.`
- Analysis custom-post URL:
  - `https://www.reddit.com/r/queuelens_dev/comments/1thuc1z/queuelens_analysis/`
- Observed result:
  - QueueLens review card visible: `yes`
  - Exact fixture text quoted in evidence: `partial`
  - Suggested action/confidence: `cautious`
  - Analysis quality visible: `yes`
  - Raw context drawer visible/openable: `yes`
- Caveat to record:
  - the evidence panel quoted the fixture title and relevant rules
  - available screenshots did not show the full body sentence quoted end to end
  - the UI also showed a partial-result warning and removed unsupported evidence
- Screenshot paths:
  - no local screenshot file path was captured in this workspace for case 4

## Recursive-analysis guardrail

- Status: `locally verified`
- Scope:
  - if the selected target is a QueueLens-generated analysis post, the route does not analyze it
- Visible user-facing behavior:
  - toast: `QueueLens analysis posts cannot be analyzed.`
- Regression test:
  - added in `src/tests/menuAnalyze.test.ts`

## Local automated verification

### Before final write-up

- `npm run typecheck`: passed
- `npm test`: passed, `7 files / 27 tests`
- `npm run build`: passed
- `npm run dev`: observed Playtest ready at `v0.0.1.54`

### Final rerun status

- `npm run typecheck`: passed
- `npm test`: passed, `7 files / 27 tests`
- `npm run build`: passed

## Known caveats

- Case 2 comment-target flow is still not live-proven end to end.
- Case 3 shows safe redaction behavior, but prioritization / suggested action appears too aggressive for synthetic content.
- Case 4 is appropriately cautious overall, but the available evidence view was only partially shown in screenshots.

## Submission readiness

- QueueLens is **not fully ready for submission** yet.
- Reason:
  - case 1 is proven
  - case 3 is proven with a behavior concern
  - case 4 is proven with an evidence caveat
  - case 2 comment-target flow remains unstable and is not honestly proven end to end
