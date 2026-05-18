# QueueLens Verification

All commands in this log were run from `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

## Current verified state

- QueueLens is running in the active repo at `C:\Users\Chimdumebi\DevvitTemp\queuelens`.
- Devvit playtest previously had a port `5678` blocker, but that was later resolved.
- `npm run dev` reached Playtest ready.
- QueueLens opened inside `r/queuelens_dev`.
- Post menu/session flow worked.
- Missing OpenAI key fallback worked.
- Devvit global setting `openaiApiKey` was configured.
- OpenAI happy path worked.
- Evidence validation warning appeared for unsupported AI evidence.
- Allowed evidence snippets and repeated-link detection were added afterward.
- Port `5678` was reclaimed again in this pass by stopping a stale workspace `node` process.
- `npm run dev` reached Playtest ready again in this pass.
- Deterministic evidence fallback is now implemented after validation, not by weakening the validator.
- Repeated bare-domain spam detection is now implemented.
- Fake personal-info redaction and low-severity deterministic detection are now implemented for demo use.
- Automated verification currently passes:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## Automated verification

### Current passing commands

| Command | Exit | Result summary |
| --- | --- | --- |
| `npm run typecheck` | `0` | TypeScript project build passed |
| `npm test` | `0` | Vitest passed: 6 files, 24 tests |
| `npm run build` | `0` | Devvit build passed with non-blocking warnings |
| `npm run dev` | observed | Playtest ready reached after reclaiming port `5678` |

### Current test coverage proven by automation

- `src/tests/deterministicSignals.test.ts`
  - rule-title phrase signal
  - repeated-domain signal
  - unavailable-context signal
- `src/tests/aiSchema.test.ts`
  - valid schema pass
  - missing field fail
  - invalid enum fail
  - malformed input fail-safe
- `src/tests/validateAnalysis.test.ts`
  - exact reported-content evidence pass
  - exact parent-context evidence pass
  - exact subreddit-rule evidence pass
  - invented evidence stripped
  - paraphrased evidence stripped
  - exact deterministic-signal evidence pass
  - unsupported high-priority output downgraded
- `src/tests/integration/analysisFlow.test.ts`
  - deterministic plus validation flow works on a fixture bundle
- `src/tests/pipeline.test.ts`
  - deterministic fallback appears when AI evidence is empty
  - fallback does not replace already-valid AI evidence
- `src/tests/redditContext.test.ts`
  - comment target parent-post context path
  - unavailable parent note path
  - live vs demo-fallback rule source propagation

## Manual verification completed

These manual results are the current baseline and must not be downgraded unless newer evidence disproves them:

- Devvit playtest reached Playtest ready.
- QueueLens opened in `r/queuelens_dev`.
- Post menu/session flow worked.
- Missing OpenAI key fallback worked.
- `openaiApiKey` was configured through Devvit global settings.
- OpenAI happy path worked.
- Unsupported AI evidence warning appeared in the UI or run output.
- In this pass, `npm run dev` again reached Playtest ready after reclaiming port `5678`.

## Manual verification pending

These items are still pending and must not be described as working until re-verified:

- Comment target flow in live Reddit UI.
- Spam evidence after the allowed-snippet fix in live Reddit UI.
- Fake personal-info test case in live Reddit UI.
- Civility or ambiguous case in live Reddit UI.
- Final compact UI review with screenshots.

## Historical issue now resolved

### Previous playtest blocker

- `npm run dev` was previously blocked by `EADDRINUSE` on port `5678`.
- That blocker was later resolved.
- In this pass, the port was blocked again by a stale workspace `node` process and was resolved locally by stopping that process before retrying playtest.
- The current baseline is not "playtest blocked."
- The current baseline is "Playtest ready was reached."

Required wording:

- Use: `npm run dev: previously blocked by EADDRINUSE on port 5678, later resolved; Playtest ready was reached`
- Do not use: `npm run dev: still blocked by EADDRINUSE on port 5678`

## Evidence reliability status

### Verified

- Evidence validation remains strict.
- Unsupported AI evidence is rejected and produces a warning.
- Allowed evidence snippets were added to the AI prompt to improve exact-evidence generation.
- Repeated-link detection was improved to emit exact `matchedText`.
- Repeated bare-domain detection now emits exact `matchedText`.
- Deterministic evidence fallback now attaches exact validated signal evidence only after validation when AI evidence is empty.
- Fake email and phone literals are redacted before analysis and can surface as exact redacted evidence.
- High-priority output without valid evidence still downgrades safely.

### Still pending in the live UI

- Spam evidence after the allowed-snippet fix still needs a manual UI re-test.
- Comment-target evidence behavior still needs manual verification.
- Personal-info and civility case evidence still need manual verification.

## Current known limits

- Comment support is exposed in the menu, but end-to-end manual verification is still pending.
- Post-target flow is verified; comment-target flow is not yet verified.
- The current automation proves validator and signal behavior, not the full live Devvit UI for every case.

## Next manual checks

1. Re-test the repeated-link spam case in the Devvit UI after the allowed-snippet change.
2. Run a full comment-target flow end to end.
3. Run a fake personal-info test case.
4. Run a civility or ambiguous case.
5. Do a final compact UI review once demo-hardening polish lands.
