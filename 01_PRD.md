# QueueLens PRD

## Product

QueueLens is a Reddit Devvit moderation tool that helps subreddit moderators review reported posts and comments faster by turning scattered context into one AI-generated, evidence-backed moderation decision card.

## Current implementation status

QueueLens is now running as an official Devvit React app in the active repo at `C:\Users\Chimdumebi\DevvitTemp\queuelens`.

The implemented runtime flow is:

1. Moderator opens a post or comment menu.
2. Moderator selects `Analyze with QueueLens`.
3. The server route creates a QueueLens custom post with `reddit.submitCustomPost(...)`.
4. The server stores a short-lived Redis session keyed to that custom post.
5. The custom post loads the `splash` entrypoint.
6. `App.tsx` calls `GET /api/analyze`.
7. The server pipeline gathers bounded Reddit context, runs deterministic signals, builds the AI prompt, calls OpenAI server-side, validates schema, validates exact evidence, and returns a trusted result.
8. The client renders the decision card, evidence panel, deterministic signals, and raw context drawer.
9. The human moderator makes the final decision.

### Completed verification

- Devvit playtest previously had a port `5678` blocker, but that was later resolved.
- `npm run dev` reached Playtest ready.
- QueueLens opened inside `r/queuelens_dev`.
- Post menu/session flow worked.
- Missing OpenAI key fallback worked.
- Devvit global setting `openaiApiKey` was configured.
- OpenAI happy path worked.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.

### Pending verification

- Comment target flow.
- Spam evidence after the allowed-snippet fix.
- Personal-info test case.
- Civility or ambiguous case.
- Final compact UI review after demo-hardening polish.

## What the app is

QueueLens is a moderator-only workflow tool for reviewing one Reddit post or comment at a time. It gathers the selected content, nearby thread context, limited public user activity, subreddit rules or demo rules, and deterministic signals, then sends a bounded payload to OpenAI. The AI returns structured JSON that is validated before being shown to the moderator.

The final output is a decision card with a summary, possible rule match, review priority, confidence, evidence snippets, and suggested next action.

## What the app is not

QueueLens is not:

- a chatbot
- a full modqueue replacement
- a modmail replacement
- an AutoModerator rule generator
- a spam network graph
- an automatic banning or removal system
- a permanent user risk database
- a cross-subreddit surveillance tool
- a general Reddit analytics dashboard

## Primary actor

Subreddit moderator.

## Secondary actor

Hackathon judge or demo viewer evaluating whether the workflow is useful, trustworthy, and polished.

## Main job to be done

When a moderator sees a reported or questionable post or comment, they need to quickly understand:

- what happened
- what context matters
- whether a subreddit rule may apply
- what evidence supports the concern
- what action to consider next

QueueLens compresses that review workflow into one structured context card.

## User pain

Moderators often need to leave the modqueue or current Reddit screen to inspect the parent thread, user history, rules, and surrounding context. This creates slow reviews, missed context, inconsistent decisions, and unnecessary tab switching.

## V1 scope

V1 is one complete AI-assisted moderation review flow:

1. Moderator opens the menu on a post or comment.
2. Moderator selects `Analyze with QueueLens`.
3. QueueLens creates a custom post session and stores a short-lived Redis handoff payload.
4. QueueLens gathers bounded Reddit context.
5. QueueLens runs deterministic signal extraction.
6. QueueLens sends the bounded payload to OpenAI server-side.
7. QueueLens validates the AI response schema.
8. QueueLens validates exact evidence snippets against fetched context.
9. QueueLens renders a trusted decision card.
10. Human moderator makes the final decision.

## Must-have requirements

### Reddit and Devvit flow

- Add a moderator-only menu action named `Analyze with QueueLens`.
- Support post and comment targets when they are verified.
- Read the selected post or comment target ID from the Devvit menu action context.
- Use `submitCustomPost` plus Redis session handoff to move from menu action into the QueueLens webview.
- Fetch selected content metadata and text.
- Fetch limited parent or thread context where available.
- Fetch limited recent public activity from the selected author where available.
- Load subreddit rules when available, or use demo rules for local or test mode fallback.
- Show loading, success, partial, empty, and error states.

### AI analysis

- AI API integration is required in V1.
- The AI request must be made server-side only.
- The API key must never be exposed to the client.
- The AI must receive a bounded payload only.
- The AI must return structured JSON.
- The response must be validated against a schema before rendering.
- Evidence snippets from AI must be exact substrings from fetched context, loaded rules, or deterministic signals.
- If evidence validation fails, unsupported claims must be removed or replaced with a safe fallback.
- AI suggested actions are advisory only.

### Decision card

The decision card must show:

- content summary
- possible rule match
- review priority: low, medium, or high
- confidence: low, medium, or high
- suggested action: approve, remove, escalate, or needs manual review
- evidence panel with original exact snippets
- deterministic signals panel
- raw context drawer
- clear label that the human moderator makes the final decision

### Trust and safety

- No automatic removals.
- No automatic bans.
- No automatic user messages.
- No long-term user profiling.
- No hidden risk score presented as fact.
- No unsupported claims.
- No hallucinated rules, reports, or user behavior.

## Demo-hardening requirements

These are the next high-value, low-risk improvements for the current app:

- evidence reliability in the live Devvit UI
- compact decision card layout
- copy moderator note action
- rule coverage panel
- analysis quality checks
- demo fixtures for repeatable showcase cases

## Should-have requirements

- Highlight matched terms or rule phrases in the evidence panel.
- Show why each deterministic signal mattered.
- Show an `AI unavailable` state that still displays raw gathered context and deterministic signals.
- Include a demo mode or demo fixtures for the hackathon video.
- Include a simple privacy note explaining what data is sent to the AI API.

## Nice-to-have requirements

- Copyable moderator note draft.
- Exportable context card as plain text.
- Small badge showing whether the card was generated from live Reddit data or demo data.
- Light UI polish after trust and clarity issues are addressed.
- Basic latency display for AI analysis.

## Out of scope for V1

- Bulk modqueue triage.
- Modmail analysis.
- Report spam clustering.
- Cross-subreddit account network analysis.
- AutoModerator editing.
- Storing historical user behavior.
- Database-backed history.
- Moderator team assignment workflow.
- Mobile-specific redesign.
- Admin-level report abuse tooling.
- Autonomous enforcement.
- Chatbot UI.

## Acceptance criteria

The V1 build is accepted only if:

1. A moderator-only menu action appears on supported targets in a test subreddit.
2. Clicking the action starts the QueueLens session flow.
3. The system creates a short-lived session handoff and opens the QueueLens custom post.
4. The system fetches selected content and at least one surrounding context source.
5. The system creates a bounded analysis payload.
6. The system calls OpenAI server-side.
7. The AI returns structured JSON.
8. Invalid AI JSON does not crash the app.
9. Hallucinated evidence snippets are rejected.
10. The UI renders a decision card with summary, priority, confidence, suggested action, evidence, deterministic signals, and raw context.
11. The app clearly states that the final decision belongs to the moderator.
12. A failed AI request produces a visible error or partial state and does not expose secrets.
13. Core behavior is verified with tests, logs, screenshots, or manual UI checks.

## Constraints

- Must be built as a Devvit mod tool.
- Must use an AI API in V1.
- Must keep AI behind server-side code.
- Must use structured output or schema-validated JSON.
- Must prefer deterministic validation before trusting AI output.
- Must keep context bounded for cost, latency, and privacy.
- Must avoid auto-enforcement in V1.
- Must stay hackathon-buildable.

## Current open questions

- Whether comment target flow passes manual verification end to end in the current build.
- Whether spam evidence now appears reliably in the Devvit UI after the allowed-snippet fix.
- Whether the personal-info and civility cases produce trustworthy evidence and action suggestions.
- Whether live subreddit rules are sufficient for the demo, or whether demo-rule fallback still needs special handling.
- What exact Devpost privacy wording and demo assets are required at submission time.
