# QueueLens Plan

## Current status summary

QueueLens is already past the initial scaffolding phase. The current app is an official Devvit React app with:

- moderator-only post and comment menu entry wiring
- custom post plus Redis session handoff
- `splash` entrypoint loading the QueueLens UI
- `App.tsx` fetching analysis from the server
- bounded Reddit context gathering
- deterministic signals
- OpenAI structured analysis
- strict schema validation
- strict exact evidence validation
- raw context visibility

Current verified baseline:

- Devvit playtest was previously blocked by `EADDRINUSE` on port `5678`, but that was later resolved.
- `npm run dev` reached Playtest ready.
- QueueLens opened inside `r/queuelens_dev`.
- Post menu/session flow worked.
- Missing OpenAI key fallback worked.
- Devvit global setting `openaiApiKey` was configured.
- OpenAI happy path worked.
- Unsupported AI evidence warning was observed.
- Allowed evidence snippets and repeated-link detection were added afterward.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

Completed in this hardening pass:

- `.gitignore` was hardened for safe Git baselining.
- The first baseline commit was created locally: `Baseline QueueLens Devvit app`.
- Port `5678` was reclaimed from a stale workspace `node` process and `npm run dev` reached Playtest ready again.
- Deterministic evidence fallback was implemented after validation.
- Repeated bare-domain spam detection was implemented.
- Redacted email and phone detection was implemented for the fake personal-info demo case.
- `ContextBundle.ruleSource` now distinguishes live rules from demo fallback rules.
- `ValidatedAnalysisResult.evidenceFallbackUsed` now surfaces fallback evidence usage.
- The UI now has a compact summary row, copy moderator note button, clearer raw context button, rule coverage panel, and visible analysis quality checks.
- Automated test coverage now includes pipeline fallback and mocked comment-context tests.

Still pending manual verification:

- comment target flow
- spam evidence after allowed-snippet fix
- personal-info case
- civility or ambiguous case
- final compact UI review

## Phase 1: Stabilize current product

### 1. Re-test spam evidence after allowed-snippet fix

Objective:
Confirm that the live Devvit UI now shows validated evidence for the repeated-link spam case after the prompt and signal updates.

Status:
Implemented in code; live Reddit UI verification still pending.

Verify:
- evidence appears in the UI
- evidence is exact, not paraphrased
- unsupported snippets still trigger warnings instead of rendering

### 2. Test comment target flow

Objective:
Confirm that the comment menu action, Redis handoff, context fetch, analysis, and rendering path work end to end for comment targets.

Status:
Bounded comment-path tests were added; live Reddit UI verification still pending.

Verify:
- comment menu action appears for moderators
- comment session opens QueueLens correctly
- analysis completes without target-type mismatch
- parent comment or parent post context appears when available

### 3. Add real subreddit rules

Objective:
Verify and tighten live-rule behavior so the demo prefers real subreddit rules when available and uses demo-rule fallback only when necessary.

Status:
Rule-source plumbing is implemented; live-rule behavior still needs Reddit-side verification.

Verify:
- live subreddit rules load in the target subreddit
- missing-rule fallback stays explicit in raw context
- rule-related evidence stays exact

### 4. Update `VERIFICATION.md` with manual proof

Objective:
Keep the verification log aligned with actual observed behavior after each manual retest.

Status:
Updated with automated results and current live-verification boundaries.

Verify:
- each completed manual check has a conservative entry
- unresolved items remain marked pending

## Phase 2: Strengthen demo value

### 1. Compact decision-card layout

Objective:
Reduce scan time and make priority, action, confidence, and evidence easier to parse in under 20 seconds.

Verify:
- summary and action are visible without excessive scrolling
- judges can identify value quickly

### 2. Copy moderator note button

Objective:
Turn the optional moderator note draft into a practical handoff output.

Verify:
- button appears only when note text exists
- copied text matches the displayed note

### 3. Better evidence row

Objective:
Make each evidence item easier to trust and easier to explain.

Verify:
- row shows snippet, matched rule when relevant, why it matters, and source
- exact evidence remains unchanged

### 4. Rule coverage panel

Objective:
Show which rules were considered so moderators and judges can see that QueueLens is grounding against subreddit policy.

Verify:
- panel distinguishes considered rules from matched evidence
- fallback rule behavior remains explicit

### 5. Analysis quality checks

Objective:
Show that the pipeline stayed trustworthy on a given run.

Verify:
- schema-valid state is visible
- evidence-validated state is visible
- no automatic action taken is visible

### 6. Demo fixtures

Objective:
Create repeatable demo cases that prove different trust and moderation scenarios.

Verify:
- clean post case exists
- repeated-link spam case exists
- ambiguous civility case exists
- fake personal-info case exists

## Phase 3: Submission readiness

### 1. README setup instructions

Objective:
Make local setup and playtest flow obvious for reviewers and future contributors.

Verify:
- setup is complete and current

### 2. Privacy and data-use note

Objective:
State clearly what QueueLens sends to OpenAI and what it does not store.

Verify:
- note matches actual architecture and guardrails

### 3. Devpost copy

Objective:
Prepare concise product positioning that matches the shipped app.

Verify:
- copy does not overclaim unverified features

### 4. 60-90 second demo script

Objective:
Produce a short demo flow that shows messy context becoming a trusted decision card.

Verify:
- script fits the available verified scenarios

### 5. Final screenshots

Objective:
Capture the final visual proof needed for submission and judging.

Verify:
- screenshots reflect the final verified UI

## Ranked improvement backlog

### A. Must fix before demo

#### 1. Re-test spam evidence fix in Devvit UI

- Why it matters: the evidence panel is the core trust mechanism, and the recent prompt fix was aimed directly at this failure mode.
- User impact: moderators need to see exact evidence for a spam recommendation to feel safe using the tool.
- Judge impact: judges need visible proof that QueueLens turns messy link spam into a grounded decision.
- Risk if ignored: the app may still look like it produces conclusions without proof.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/server/analysis/aiPrompt.ts`, `src/server/analysis/validateAnalysis.ts`, `src/client/components/EvidencePanel.tsx`, `VERIFICATION.md`
- Verification needed: manual Devvit UI run on the repeated-link spam case with screenshot or notes.

#### 2. Test comment target flow

- Why it matters: the menu is exposed on comments, so comment flow cannot remain assumed.
- User impact: comment moderation is a core use case.
- Judge impact: verified post-only behavior weakens the product story.
- Risk if ignored: visible feature claims may exceed proven behavior.
- Implementation risk: medium.
- Complexity: `S`
- Files likely touched: `src/server/routes/menuAnalyze.ts`, `src/server/reddit/redditContext.ts`, `src/server/reddit/normalizeTarget.ts`, `VERIFICATION.md`
- Verification needed: manual end-to-end comment analysis in Devvit.

#### 3. Ensure evidence appears for spam, civility, and personal-info cases

- Why it matters: the app needs to show evidence across distinct moderation situations, not just one narrow spam fixture.
- User impact: moderators need confidence that evidence is reliable in different classes of content.
- Judge impact: stronger coverage makes the demo look intentional instead of brittle.
- Risk if ignored: the app may appear inconsistent or selectively trustworthy.
- Implementation risk: medium.
- Complexity: `M`
- Files likely touched: `src/server/analysis/aiPrompt.ts`, `src/server/analysis/deterministicSignals.ts`, `src/server/analysis/validateAnalysis.ts`, `src/tests/*`, `VERIFICATION.md`
- Verification needed: manual UI checks for all three cases plus targeted tests where logic changes.

#### 4. Ensure deterministic evidence fallback appears if AI evidence is empty

- Why it matters: empty evidence after a strong signal is a trust and demo failure.
- User impact: moderators still need something concrete to inspect when AI evidence is stripped.
- Judge impact: fallback behavior shows the app fails safely instead of blanking out.
- Risk if ignored: high-priority cases may render as weak or confusing.
- Implementation risk: medium.
- Complexity: `M`
- Files likely touched: `src/server/analysis/validateAnalysis.ts`, `src/server/analysis/deterministicSignals.ts`, `src/client/components/EvidencePanel.tsx`, `src/client/App.tsx`
- Verification needed: unit coverage plus manual UI case where AI evidence is empty.

#### 5. Update README and privacy instructions

- Why it matters: setup and data-use clarity are part of trust and submission readiness.
- User impact: moderators and reviewers can configure the app correctly.
- Judge impact: privacy and safety messaging becomes easier to defend.
- Risk if ignored: confusion during setup or questions about what data leaves Reddit.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `README.md`, `03_GUARDRAILS.md`, `VERIFICATION.md`
- Verification needed: docs review against current architecture and settings flow.

### B. Should improve before submission

#### 1. Compact decision-card layout

- Why it matters: the current UI is readable but not yet optimized for a fast demo.
- User impact: moderators can scan priority, action, and summary faster.
- Judge impact: value becomes legible within 20 seconds.
- Risk if ignored: the product may feel slower and less polished than it is.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/client/App.tsx`, `src/client/components/DecisionCard.tsx`, `src/client/styles.css`
- Verification needed: manual UI review on desktop and the Devvit webview.

#### 2. Copy moderator note button

- Why it matters: this turns advisory output into something directly usable by a moderator.
- User impact: lowers friction when a moderator wants to document reasoning.
- Judge impact: creates a clear practical output beyond on-screen analysis.
- Risk if ignored: the note draft remains passive.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/client/components/DecisionCard.tsx`, `src/client/styles.css`
- Verification needed: manual copy interaction check.

#### 3. Better evidence row

- Why it matters: evidence needs more structure to be self-explanatory at a glance.
- User impact: moderators understand why a snippet matters without reading surrounding UI text.
- Judge impact: evidence quality becomes easier to appreciate quickly.
- Risk if ignored: evidence may still feel too raw or underspecified.
- Implementation risk: low to medium.
- Complexity: `M`
- Files likely touched: `src/client/components/EvidencePanel.tsx`, `src/client/styles.css`
- Verification needed: manual review across at least two cases.

#### 4. Rule coverage panel

- Why it matters: moderators need to know what policy surface was considered, not only what matched.
- User impact: improves transparency around rule grounding.
- Judge impact: makes the product look more deliberate and moderation-specific.
- Risk if ignored: rule reasoning remains underexposed.
- Implementation risk: medium.
- Complexity: `M`
- Files likely touched: `src/client/App.tsx`, `src/client/components/DecisionCard.tsx`, possible new component, `src/client/styles.css`
- Verification needed: manual UI review with live rules and demo fallback.

#### 5. Analysis quality checks

- Why it matters: trust is stronger when the UI states what passed validation.
- User impact: moderators can see that safeguards actually ran.
- Judge impact: communicates differentiated product quality instead of generic AI output.
- Risk if ignored: guardrails remain mostly invisible.
- Implementation risk: medium.
- Complexity: `M`
- Files likely touched: `src/client/App.tsx`, `src/client/components/StatePanel.tsx`, `src/shared/queueLensDomain.ts`
- Verification needed: manual review of success, partial, and missing-key cases.

#### 6. Demo fixtures

- Why it matters: repeatable cases make the final demo reliable.
- User impact: low direct product impact, high internal demo value.
- Judge impact: makes the demo crisp and varied.
- Risk if ignored: the demo may rely too much on ad hoc live content.
- Implementation risk: low to medium.
- Complexity: `M`
- Files likely touched: `src/tests/fixtures/*`, `README.md`, `VERIFICATION.md`
- Verification needed: fixture review plus manual demo run notes.

### C. Nice to have

#### 1. Better comment thread context

- Why it matters: comments often need more thread grounding than a single parent item.
- User impact: improves confidence on comment moderation.
- Judge impact: makes the comment use case stronger.
- Risk if ignored: comment reviews may feel shallow.
- Implementation risk: medium.
- Complexity: `M`
- Files likely touched: `src/server/reddit/redditContext.ts`, `src/server/security/contextLimits.ts`, `src/client/components/RawContextDrawer.tsx`
- Verification needed: unit coverage plus manual comment-flow testing.

#### 2. Export or copy plain-text analysis report

- Why it matters: gives moderators a portable artifact.
- User impact: useful for notes or off-tool handoff.
- Judge impact: modest polish improvement.
- Risk if ignored: low.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/client/App.tsx`, `src/client/components/DecisionCard.tsx`
- Verification needed: manual copy/export interaction check.

#### 3. Better empty states

- Why it matters: safer fallback messaging improves clarity when context or AI is limited.
- User impact: reduces confusion.
- Judge impact: strengthens trust polish.
- Risk if ignored: low.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/client/components/StatePanel.tsx`, `src/client/App.tsx`
- Verification needed: manual review of missing-key and error states.

#### 4. Small loading skeleton

- Why it matters: makes the app feel less abrupt while analysis runs.
- User impact: slight UX improvement.
- Judge impact: slight polish improvement.
- Risk if ignored: low.
- Implementation risk: low.
- Complexity: `S`
- Files likely touched: `src/client/components/StatePanel.tsx`, `src/client/styles.css`
- Verification needed: manual loading-state review.

### D. Do not build

#### 1. Full modqueue dashboard

- Why it matters: tempting scope creep that expands API surface and UI complexity.
- User impact: not needed to prove the product.
- Judge impact: likely dilutes the demo.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: too broad for V1.
- Verification needed: none; keep out of scope.

#### 2. Auto-removal

- Why it matters: violates the advisory-only trust model.
- User impact: risky and unwanted for V1.
- Judge impact: creates safety concerns.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 3. Auto-ban

- Why it matters: same trust and safety problem as auto-removal, worse blast radius.
- User impact: high-risk moderation mistake potential.
- Judge impact: undermines the product story.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 4. Auto-lock

- Why it matters: autonomous enforcement remains out of scope.
- User impact: risky.
- Judge impact: weakens trust.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 5. Auto-message

- Why it matters: autonomous messaging is enforcement-adjacent and high-risk.
- User impact: can mislead users with unsupported reasoning.
- Judge impact: creates safety and product-scope issues.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 6. AutoModerator rule generator

- Why it matters: changes the product into a different class of tool.
- User impact: not needed for the current moderation-card workflow.
- Judge impact: distracts from the core demo.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: too broad for V1.
- Verification needed: none; do not build.

#### 7. Modmail assistant

- Why it matters: broadens scope beyond the current one-target moderation review product.
- User impact: unrelated to the core decision-card demo.
- Judge impact: muddies positioning.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: too broad for V1.
- Verification needed: none; do not build.

#### 8. Cross-subreddit tracking

- Why it matters: privacy risk and explicit product non-goal.
- User impact: high trust risk.
- Judge impact: likely viewed negatively.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 9. Permanent user risk profiles

- Why it matters: violates the bounded-review model and privacy guardrails.
- User impact: high trust risk.
- Judge impact: weakens the story.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 10. Database-backed history

- Why it matters: adds storage and privacy scope the app does not need.
- User impact: no V1 value relative to risk.
- Judge impact: raises avoidable architecture questions.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: too broad for V1.
- Verification needed: none; do not build.

#### 11. Chatbot interface

- Why it matters: directly conflicts with the product definition and trust model.
- User impact: makes the tool less structured and less trustworthy.
- Judge impact: makes the product look generic.
- Risk if ignored: none.
- Implementation risk: medium.
- Complexity: `L`
- Files likely touched: should not be touched.
- Verification needed: none; do not build.

#### 12. Broad analytics dashboard

- Why it matters: expands the app into a different product category.
- User impact: not needed for the one-item moderation workflow.
- Judge impact: dilutes the strongest story.
- Risk if ignored: none.
- Implementation risk: high.
- Complexity: `L`
- Files likely touched: too broad for V1.
- Verification needed: none; do not build.
