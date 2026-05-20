# QueueLens

QueueLens is a Reddit Devvit moderation tool that gathers bounded post or comment context, runs deterministic signals, calls OpenAI server-side with structured JSON, validates exact evidence snippets, and renders an advisory moderation decision card. Humans always make the final call.

## What QueueLens does

QueueLens helps a moderator review one reported or questionable Reddit item at a time. It compresses scattered context into one card that shows:

- summary
- compact review summary row
- possible rule matches
- review priority
- confidence
- suggested action
- exact evidence snippets
- deterministic signals
- rule coverage
- analysis quality checks
- raw context

QueueLens is advisory only. It does not remove content, ban users, lock threads, or message users automatically.

## Current implemented flow

1. A moderator opens the menu on a post or comment.
2. The moderator selects `Analyze with QueueLens`.
3. The server creates a QueueLens custom post with `submitCustomPost`.
4. The server stores a short-lived Redis session for that post.
5. The custom post loads the `splash` entrypoint.
6. `App.tsx` calls `GET /api/analyze`.
7. The server gathers bounded Reddit context, runs deterministic signals, builds the AI prompt, calls OpenAI, validates schema, validates exact evidence, and returns a trusted result.
8. The client renders the decision card, evidence panel, signal list, and raw context drawer.

Current hardening additions:

- validated deterministic evidence fallback when AI evidence is empty
- repeated bare-domain spam detection
- redacted email and phone detection for fake personal-info demos
- reasons to be cautious panel
- suggested moderator note (copyable, advisory only)
- rule coverage panel
- visible analysis quality checks

## Requirements

- Node.js `22.2+`
- [Devvit CLI](https://developers.reddit.com/docs)
- a test subreddit where you are a moderator

## Install and run

```bash
npm install
```

### Devvit settings

Configure the OpenAI key in Devvit global app settings. Do not put it in the client or in checked-in files.

```bash
npx devvit settings set openaiApiKey
```

Optional model override:

```bash
npx devvit settings set openaiModel
```

Default model is `gpt-4o-mini`.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript project check |
| `npm test` | Unit and integration tests |
| `npm run build` | Build the Devvit client and server |
| `npm run dev` | Run `devvit playtest` |
| `npm run verify` | Typecheck then test |

## Devvit playtest

Run:

```bash
npm run dev
```

Known history:

- `npm run dev` was previously blocked by `EADDRINUSE` on port `5678`.
- That issue was later resolved.
- Playtest ready was reached.
- QueueLens opened inside `r/queuelens_dev`.

## What data is sent to OpenAI

QueueLens sends only bounded, review-time data needed for the moderation brief:

- target post title and body, or comment body
- limited parent context when available
- limited recent public activity from the target author
- subreddit rules when available, or explicit demo-rule fallback
- deterministic signals
- unavailable-context notes where relevant

QueueLens also provides a strict list of allowed evidence snippets so the model must copy evidence exactly instead of paraphrasing it.

## Privacy and safety

- `openaiApiKey` stays server-side in Devvit settings.
- QueueLens does not expose the OpenAI key to the client.
- QueueLens does not log secrets.
- QueueLens does not store long-term user profiles.
- Redis is used only for short-lived QueueLens session handoff.
- Raw context remains visible to the moderator.
- Exact evidence validation remains strict.

## No autonomous enforcement

QueueLens is advisory only.

QueueLens does not:

- auto-remove
- auto-ban
- auto-lock
- auto-message
- auto-enforce anything

The final moderation decision always remains with the human moderator.

## How to test post flow

1. Start Devvit playtest with `npm run dev`.
2. Open a test post in the target subreddit as a moderator.
3. Open the post menu.
4. Select `Analyze with QueueLens`.
5. Confirm QueueLens opens in a custom post.
6. Confirm the card renders and the raw context drawer is available.

Current status:

- Post menu/session flow was manually verified.

## How to test comment flow

1. Start Devvit playtest with `npm run dev`.
2. Open a test comment in the target subreddit as a moderator.
3. Open the comment menu.
4. Select `Analyze with QueueLens`.
5. Confirm QueueLens opens in a custom post.
6. Confirm the analysis completes and parent context appears when available.

Current status:

- Comment target flow still needs manual verification.

## Demo test cases

Use these cases for demo-hardening and final review:

- repeated-link spam
- ambiguous civility case
- fake personal-info case
- clean post case

## Current verification status

### Verified

- Playtest ready was reached.
- Playtest ready was reached again in this hardening pass after reclaiming port `5678`.
- QueueLens opened inside `r/queuelens_dev`.
- Post menu/session flow worked.
- Missing OpenAI key fallback worked.
- `openaiApiKey` was configured through Devvit global settings.
- OpenAI happy path worked.
- Unsupported AI evidence warning appeared when evidence did not validate.
- `npm run typecheck`, `npm test`, and `npm run build` pass after the hardening changes.
- Deterministic evidence fallback is implemented and covered by automated tests.
- Repeated bare-domain spam detection is implemented and covered by automated tests.
- Mocked comment-context tests now cover parent lookup, unavailable-parent handling, and rule-source propagation.
- `npm run typecheck`, `npm test`, and `npm run build` pass.

### Pending

- repeated-link spam case in the live Devvit UI
- comment target flow in the live Devvit UI
- fake personal-info case in the live Devvit UI
- civility or ambiguous case in the live Devvit UI
- final compact UI review with screenshots

## Product docs

- `01_PRD.md`
- `02_ARCHITECTURE.md`
- `03_GUARDRAILS.md`
- `04_PLAN.md`
- `VERIFICATION.md`
