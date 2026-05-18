# QueueLens Guardrails

## Purpose

This document defines what is forbidden, what must be proven, and how QueueLens must stay trustworthy as the demo hardens.

## Scope control

- If it is not in the PRD, do not build it.
- No scope additions without updating the PRD.
- No boundary or ownership changes without updating Architecture.
- No new integration without updating Architecture.
- New features must improve demo clarity, moderator trust, evidence quality, Devvit reliability, or submission readiness.
- Do not add broad capabilities just because they are technically possible.

## Build behavior

- Think before coding.
- Turn each request into a concrete goal before coding.
- State assumptions explicitly.
- If something is unclear, say what is unclear instead of guessing.
- If multiple valid interpretations exist, present them instead of choosing silently.
- Prefer the simplest approach that fully solves the task.
- Push back on unnecessary complexity.
- Prefer verifiable progress over broad rewrites.

## Implementation rules

- Write the minimum code necessary.
- Do not add features beyond what was asked.
- Do not add abstractions, configurability, or flexibility unless required by the PRD or Architecture.
- Do not refactor unrelated code.
- Do not clean up adjacent code, comments, or formatting unless the task requires it.
- Match existing style and local conventions.
- Remove only unused imports, variables, or functions made obsolete by the current change.
- If unrelated dead code or design issues are noticed, mention them instead of changing them.
- No placeholder logic in the core flow.
- No duplicate business logic.
- No silent failures.
- No hidden assumptions.
- Missing requirements must be surfaced explicitly.

## Explicit bans

- No autonomous enforcement.
- No auto-remove.
- No auto-ban.
- No auto-lock.
- No auto-message.
- No chatbot UI.
- No database-backed history.
- No cross-subreddit tracking.
- No permanent user risk profiles.

## AI rules

- AI API integration is mandatory in V1.
- AI must be used only for structured moderation analysis.
- AI must not be used for Reddit data fetching, permission checks, routing, validation, or enforcement.
- AI must not make final moderation decisions.
- AI must not invent facts, reports, rules, user history, moderator actions, or evidence.
- AI must return structured JSON.
- AI output must pass schema validation before rendering.
- AI evidence snippets must be exact substrings from fetched context, loaded rules, or deterministic signals.
- Unsupported AI claims must be removed, downgraded, or replaced with a manual-review fallback.
- If the AI API fails, times out, refuses, or returns invalid output, the app must show a safe error or partial state.
- The UI must label AI output as review assistance, not a verdict.
- The UI must keep the final action with the human moderator.

## Deterministic logic rules

- Use deterministic logic for validation, routing, parsing, permissions, evidence checks, and policy checks before trusting AI.
- Deterministic signal extraction must run before AI.
- Deterministic signals must be explainable.
- Deterministic signals must not pretend to be proof by themselves.
- Risk or review priority must be labeled as review priority, not objective truth.
- Schema validation must happen even if OpenAI Structured Outputs are used.
- Evidence validation must happen after AI output is parsed.

## Evidence and trust rules

- Every displayed evidence snippet must come from available context.
- Every evidence item must include a source label.
- If source context is unavailable, the UI must say unavailable instead of guessing.
- No evidence-only-by-paraphrase in the evidence panel.
- Paraphrased summaries must be separate from exact evidence.
- Raw context must remain available through a drawer or expandable panel.
- Confidence labels must be low, medium, or high only.
- Suggested action must be approve, remove, escalate, or needs manual review only.
- Any high-priority result must show at least one valid evidence snippet or be downgraded.
- Exact evidence validation must stay strict.
- Uncertainty must not be hidden.

## Privacy and security rules

- Do not expose API keys client-side.
- Store the AI API key only in Devvit global settings or another approved server-side secret store.
- Do not commit secrets.
- Do not log API keys, auth tokens, or raw secret values.
- Do not send unnecessary personal data to the AI API.
- Do not store long-term user profiles.
- Do not create a permanent risk database.
- Do not collect private user data unavailable through Devvit.
- Do not imply access to private Reddit data.
- Limit context size before sending to AI.
- Redact or omit unnecessary fields before the AI request.
- If external fetch is used, document the external domain and privacy behavior.
- Add or draft a privacy note before public submission if required.

## Redis rule

- Redis may store only short-lived QueueLens session handoff data.
- Redis must not become user profiling, history storage, moderation memory, or product persistence.
- Redis is allowed only to bridge menu action state into the QueueLens custom post flow.

## Devvit-specific rules

- The app must be built as a Devvit Mod Tool.
- Menu action must be moderator-only.
- The action must support posts and comments only if both are implemented and verified.
- If one target type is not working, it must be disabled or clearly marked unsupported.
- HTTP fetch must be server-side.
- The AI request must respect timeout limits.
- Missing Reddit context must not crash the flow.
- Deleted, removed, or unavailable content must produce a controlled unavailable state.

## UI rules

- Do not build a chatbot UI.
- The primary UI is a decision card.
- The card must separate:
  - fetched facts
  - deterministic signals
  - AI interpretation
  - suggested action
  - evidence
- Show loading, success, partial, empty, and error states.
- Make it obvious that the moderator controls the final decision.
- Do not hide uncertainty.
- Do not use scary or overconfident language for review priority.
- Do not remove raw context access.

## Testing and verification rules

- Never claim success without verification.
- Use the narrowest reasonable check.
- For bug fixes, reproduce the issue before confirming the fix when possible.
- For refactors, confirm behavior is unchanged.
- If something could not be verified, say that explicitly.
- Every completed plan step must produce at least one verification artifact.
- If verification fails, the step is not done.
- If a step regresses previously verified behavior, fix it or explicitly accept the regression before continuing.
- Claims without evidence are unverified.

## Acceptable verification artifacts

- unit test result
- integration test result
- manual UI check result
- lint output
- typecheck output
- sample input or output result
- schema validation result
- evidence validation result
- screenshot
- log output
- CLI output

## Required test cases

### AI schema validation

- valid AI JSON passes
- missing required field fails
- invalid enum fails
- malformed JSON fails safely

### Evidence validation

- exact snippet from reported content passes
- exact snippet from parent context passes
- exact snippet from subreddit rule passes
- exact snippet from deterministic signal passes
- invented snippet fails
- paraphrased evidence fails as evidence

### Deterministic signals

- keyword or rule match produces expected signal
- no match produces no false signal
- repeated link signal works with fixture
- unavailable context creates unavailable note

### UI states

- loading state renders
- success state renders
- partial AI failure state renders
- full error state renders
- empty context state renders

### Security

- API key is not present in the client bundle
- API key is not printed in logs
- failed AI request does not expose secrets
- context sent to AI is bounded

## Communication rules

- Separate facts, assumptions, and interpretation.
- Surface tradeoffs early.
- Do not hide uncertainty.
- Report what changed, how it was verified, and what remains uncertain.
- Do not say a feature works unless verification evidence exists.

## Definition of done

The build is done only when:

- all must-have PRD items are complete
- core flows have verification artifacts
- active blockers are resolved or explicitly accepted
- no unresolved guardrail violations remain
- the delivered system still matches the current PRD and Architecture
- the demo flow works from menu action to validated decision card
- AI failures are handled safely
- no secrets are exposed
