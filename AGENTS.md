# AGENTS.md

## Working agreements

- Think before coding.
- State assumptions explicitly.
- If something is unclear, say what is unclear instead of guessing.
- If multiple valid interpretations exist, present them instead of choosing silently.
- Prefer the simplest approach that fully solves the task.
- Push back on unnecessary complexity.

## Implementation rules

- Write the minimum code necessary.
- Do not add features beyond what was asked.
- Do not add abstractions, configurability, or flexibility unless requested.
- Do not refactor unrelated code.
- Do not clean up adjacent code, comments, or formatting unless the task requires it.
- Match the existing style and local conventions.
- Remove only the unused imports, variables, or functions that your own changes made obsolete.
- If you notice unrelated dead code or design issues, mention them instead of changing them.

## Execution rules

- Turn the request into a concrete goal before coding.
- For non-trivial tasks, write a brief plan with a verification step for each major step.
- Prefer verifiable progress over broad rewrites.

Example format:
1. [step] -> verify: [check]
2. [step] -> verify: [check]
3. [step] -> verify: [check]

## Verification rules

- Never claim success without verification.
- Use the narrowest reasonable check.
- For bug fixes, reproduce the issue before and confirm the fix after when possible.
- For refactors, confirm behavior is unchanged.
- If something could not be verified, say that explicitly.

## Communication rules

- Separate facts, assumptions, and interpretation.
- Surface tradeoffs early.
- Do not hide uncertainty.
- Report what changed, how it was verified, and what remains uncertain.

```
## Required skill

Use this clean-code working style for the whole project.

If using an AI coding environment that supports skills, install the security skill before implementation work:

```bash
npx skills add https://github.com/raroque/vibe-security-skill --skill vibe-security
```