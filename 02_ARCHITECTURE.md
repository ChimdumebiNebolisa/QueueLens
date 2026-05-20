# QueueLens Architecture

## Architecture goal

Define the smallest complete system that supports the current QueueLens V1 app:

- moderator-only Devvit menu action
- custom post session handoff
- bounded Reddit context gathering
- deterministic signal extraction
- OpenAI structured analysis
- schema and exact-evidence validation
- trusted decision card UI

## Runtime flow

QueueLens does not run as a direct menu-action-to-card route. The implemented flow is:

1. `devvit.json` exposes a moderator-only `Analyze with QueueLens` menu item for `post` and `comment`.
2. The menu action calls `src/server/routes/menuAnalyze.ts`.
3. `menuAnalyze.ts` validates menu input, infers target type, and resolves the subreddit Review Desk via `src/server/reviewDesk.ts` (`getOrCreateReviewDeskPost`, creating the desk with `reddit.submitCustomPost(...)` only when needed).
4. `menuAnalyze.ts` creates a unique analysis session at `queuelens:analysis:{analysisSessionId}` containing `targetType`, `targetId`, `subredditName`, and `deskPostId`, with the desk registry at `queuelens:desk:{subredditName}`.
5. `menuAnalyze.ts` stores the session id on the Review Desk custom post via **postData**, keyed by the current moderator user id (`storeAnalysisSessionBridgeOnReviewDeskPost` in `reviewDesk.ts`). Same-user rapid analyzes may overwrite that user's active pointer (acceptable for V1). This avoids cross-moderator last-write-wins on a shared desk key.
6. The moderator is navigated to the Review Desk URL. `analysisSessionId` may appear in the query string for debugging, but live playtest showed the embedded Devvit webview often does not receive query params (see `VERIFICATION.md`).
7. The Review Desk custom post opens the `default` post entrypoint from `devvit.json`, which serves `src/client/splash.html`.
8. `src/client/splash.tsx` mounts `src/client/App.tsx`.
9. `App.tsx` calls `GET /api/analyze?analysisSessionId=...` (session id from Review Desk postData for the current user; URL query and hash are fallback/debug only).
10. `src/server/routes/analyzeTarget.ts` resolves the session id from Review Desk postData first, then query (same order as the client), loads the analysis session from Redis, and verifies it matches the current Review Desk post and subreddit when possible.
11. `src/server/analysis/pipeline.ts` orchestrates:
   - `src/server/reddit/redditContext.ts`
   - `src/server/analysis/deterministicSignals.ts`
   - `src/server/analysis/aiPrompt.ts`
   - `src/server/analysis/aiAnalysis.ts`
   - `src/server/analysis/validateAnalysis.ts`
12. The validated result is returned to the client.
13. The client renders the decision card, evidence panel, deterministic signals, and raw context drawer.
14. The moderator decides what to do. QueueLens does not enforce anything.

## Major system parts

### 1. Devvit shell and menu configuration

Owns:

- app configuration in `devvit.json`
- moderator-only menu visibility
- Reddit, HTTP, and Redis permissions
- post entrypoint wiring

Responsibilities:

- expose the QueueLens menu item on supported targets
- restrict visibility to moderators
- route menu actions into the QueueLens session flow
- expose global settings for `openaiApiKey` and optional `openaiModel`

### 2. Session handoff layer

Owns:

- menu request parsing
- Review Desk resolution (one reusable custom post per subreddit)
- temporary Redis session storage
- navigation into the Review Desk post

Primary files:

- `src/server/routes/menuAnalyze.ts`
- `src/server/reviewDesk.ts`

Responsibilities:

- accept only supported menu locations
- validate expected post/comment thing id shape
- get or create the QueueLens Review Desk for the subreddit
- create a unique short-lived analysis session per Analyze action (not a shared desk-level handoff)
- write the active session id to Review Desk postData keyed by moderator user id (primary session bridge)
- return safe UI feedback if startup fails

### 3. Analysis route layer

Owns:

- `GET /api/analyze`
- Redis session lookup
- pipeline invocation
- route-level error handling

Primary file:

- `src/server/routes/analyzeTarget.ts`

Responsibilities:

- require `analysisSessionId` on `GET /api/analyze`
- load the short-lived analysis session from `queuelens:analysis:{analysisSessionId}`
- require Devvit `postId` and `subredditName` on the Review Desk webview (fail closed if missing)
- verify the session matches the current Review Desk post and subreddit
- reject missing, expired, or malformed session state safely (fail closed, no pipeline on unknown targets)
- return the validated analysis result or a safe error

### 4. Reddit context collector

Owns:

- selected post/comment fetch
- parent context fetch for comments
- limited recent author activity
- subreddit rules load with demo-rule fallback
- context bounding and redaction

Primary files:

- `src/server/reddit/redditContext.ts`
- `src/server/reddit/normalizeTarget.ts`
- `src/server/reddit/demoRules.ts`
- `src/server/reddit/redditIds.ts`

Responsibilities:

- normalize Reddit data into QueueLens domain types
- bound text and list sizes before AI
- tolerate missing or unavailable content
- surface unavailable context explicitly
- avoid guessing hidden or missing data

### 5. Deterministic signal layer

Owns:

- repeated-link and repeated-domain checks
- keyword checks
- rule-title phrase checks
- report-reason and missing-context signals

Primary file:

- `src/server/analysis/deterministicSignals.ts`

Responsibilities:

- produce explainable pre-AI signals
- provide exact `matchedText` when possible
- stay advisory only
- never make moderation decisions

### 6. AI analysis layer

Owns:

- OpenAI request construction
- prompt building
- model setting lookup
- timeout and request failure handling
- local schema parsing after model output

Primary files:

- `src/server/analysis/aiPrompt.ts`
- `src/server/analysis/aiAnalysis.ts`
- `src/server/analysis/aiSchema.ts`

Responsibilities:

- send only bounded context
- keep `openaiApiKey` server-side only
- request structured JSON
- provide allowed exact evidence snippets to the model
- fail safely when the key is missing, the model errors, or JSON is invalid

### 7. Validation layer

Owns:

- local schema validation
- evidence substring validation
- source-specific evidence checks
- downgrade logic for unsupported high-priority output

Primary file:

- `src/server/analysis/validateAnalysis.ts`

Responsibilities:

- reject or strip unsupported evidence
- reject paraphrase-only evidence
- preserve exact-match evidence only
- downgrade unsupported high-priority output to manual review

### 8. Client UI layer

Owns:

- fetch lifecycle
- summary card rendering
- evidence rendering
- signal rendering
- raw context visibility
- loading, partial, and error states

Primary files:

- `src/client/App.tsx`
- `src/client/api.ts`
- `src/client/components/DecisionCard.tsx`
- `src/client/components/EvidencePanel.tsx`
- `src/client/components/SignalList.tsx`
- `src/client/components/ConfidenceBadge.tsx`
- `src/client/components/RawContextDrawer.tsx`
- `src/client/components/StatePanel.tsx`
- `src/client/styles.css`

Responsibilities:

- render only validated analysis results
- keep the human moderator in control
- show uncertainty and warnings visibly
- preserve raw context access
- avoid chatbot patterns

## Core entities

### ModerationTarget

```ts
type ModerationTarget = {
  id: string;
  type: "post" | "comment";
  subredditName: string;
  authorName: string | null;
  title?: string;
  bodyText: string;
  permalink?: string;
  createdAt?: string;
  reportReason?: string | null;
};
```

### ContextBundle

```ts
type ContextBundle = {
  target: ModerationTarget;
  parentContext: ContextItem[];
  recentUserActivity: ContextItem[];
  subredditRules: SubredditRule[];
  unavailableContext: UnavailableContextNote[];
};
```

### DeterministicSignal

```ts
type DeterministicSignal = {
  id: string;
  label: string;
  severity: "info" | "low" | "medium" | "high";
  matchedText?: string;
  reason: string;
};
```

### AIAnalysis

```ts
type AIAnalysis = {
  summary: string;
  possibleRuleMatches: string[];
  reviewPriority: "low" | "medium" | "high";
  suggestedAction: "approve" | "remove" | "escalate" | "needs_manual_review";
  confidence: "low" | "medium" | "high";
  evidence: EvidenceItem[];
  moderatorNoteDraft?: string;
};
```

### ValidatedAnalysisResult

```ts
type ValidatedAnalysisResult = {
  status: "success" | "partial" | "error";
  contextBundle: ContextBundle;
  deterministicSignals: DeterministicSignal[];
  aiAnalysis?: AIAnalysis;
  validationWarnings: string[];
  safeFallbackMessage?: string;
};
```

## Active files

These files are part of the live QueueLens runtime path:

- `devvit.json`
- `src/server/index.ts`
- `src/server/routes/menuAnalyze.ts`
- `src/server/routes/analyzeTarget.ts`
- `src/server/reddit/redditContext.ts`
- `src/server/reddit/normalizeTarget.ts`
- `src/server/reddit/redditIds.ts`
- `src/server/reddit/demoRules.ts`
- `src/server/security/contextLimits.ts`
- `src/server/security/redact.ts`
- `src/server/analysis/pipeline.ts`
- `src/server/analysis/deterministicSignals.ts`
- `src/server/analysis/aiPrompt.ts`
- `src/server/analysis/aiAnalysis.ts`
- `src/server/analysis/aiSchema.ts`
- `src/server/analysis/validateAnalysis.ts`
- `src/shared/queueLensDomain.ts`
- `src/client/splash.html`
- `src/client/splash.tsx`
- `src/client/App.tsx`
- `src/client/api.ts`
- `src/client/components/*`
- `src/client/styles.css`
- `src/tests/*`

## Likely template leftovers

These files appear to be starter-template residue or inactive examples in the current app. They are not part of the mounted QueueLens runtime path:

- `src/server/routes/api.ts`
- `src/server/routes/menu.ts`
- `src/server/routes/forms.ts`
- `src/server/routes/triggers.ts`
- `src/server/core/post.ts`
- `src/client/game.html`
- `src/client/game.tsx`
- `src/client/hooks/useCounter.ts`
- `src/client/index.css`
- `src/shared/api.ts`

They should be treated as inactive until deliberately reused or removed in a later cleanup task.

## External dependencies

### Devvit

Used for:

- app shell
- moderator-only menu action
- Reddit API access
- server route hosting
- global settings
- custom post rendering
- Redis session handoff

### Reddit API through Devvit

Used for:

- reading selected target content
- reading immediate parent context where available
- reading limited recent public activity
- reading subreddit rules where available

### OpenAI API

Used for:

- structured moderation brief generation
- advisory classification
- summary generation
- optional moderator note draft

### Zod

Used for:

- runtime validation of AI output
- enum validation
- UI-safe result shape

## Redis rule

Redis is allowed only for short-lived QueueLens session handoff between the menu action and the QueueLens custom post.

Redis must not become:

- a moderation history store
- a user profile store
- a risk memory layer
- a cross-session analytics store
- a database substitute

## Rejected alternatives

### Direct menu-action-to-card flow

Rejected by the current implementation. QueueLens now uses custom post plus Redis handoff because that is how the app currently moves from menu action into the React UI.

### Chatbot interface

Rejected because it weakens trust and makes the product look generic. QueueLens needs a structured decision tool, not open-ended conversation.

### Auto-enforcement

Rejected because QueueLens should assist moderators, not replace them. Auto-removal, auto-ban, auto-lock, and auto-message increase safety and trust risk.

### External database

Rejected for V1 because the app does not need persistent storage. Redis is handoff-only, not product persistence.

### Long-term user risk profiles

Rejected because they increase privacy risk and make the product harder to trust. QueueLens analyzes bounded context at review time only.

## Architecture rule

No new service, storage layer, external dependency, or workflow may be added unless this Architecture document is updated first.
