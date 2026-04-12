---
name: code-simplify
version: 2.0.0
description: |
  Simplify existing code without changing behavior. Focus on local complexity reduction such as
  flattening nesting, extracting readable helpers, removing dead code, consolidating obvious
  duplication, and improving names. Use when the user explicitly asks to simplify, clean up, or
  reduce complexity in existing code.
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[scope or simplification goal]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to simplify or clean up existing code. Examples:
  "simplify this", "clean up this file", "reduce complexity here", or "/code-simplify auth.ts".
  Do not use proactively during unrelated implementation work, and do not use it for architectural
  redesign, pure performance tuning, or generated code.
---

<EXTREMELY-IMPORTANT>
This skill edits code. Non-negotiable rules:
1. Read the target code, nearby callers, and relevant tests before changing anything.
2. Establish the narrowest useful baseline check before edits when feasible.
3. Preserve behavior, side effects, and error handling.
4. Ask the user only when the scope is ambiguous, the simplification is risky, or there are real alternatives.
5. Keep the invocation body focused on the simplification loop; load detailed patterns from references only when needed.
</EXTREMELY-IMPORTANT>

# Code Simplify

## Inputs

- `$request`: Optional scope or simplification guidance such as a file path, symbol name, or a note like `flatten nested conditionals`.

## Goal

Apply the smallest safe set of readability-focused changes that makes the target code easier to understand and maintain without changing what it does.

## Step 0: Resolve scope and suitability

Determine:

- the exact file, symbol, or diff scope to simplify
- whether the user asked for a narrow cleanup or a broader pass
- whether the target is application code, tests, generated code, or a performance-sensitive path

Stop or clarify if:

- the request is too vague to identify the target safely
- the code is generated
- the requested "simplification" is actually a redesign
- the change would obviously alter public behavior or contracts

Use `AskUserQuestion` only when ambiguity blocks safe progress or when there are multiple legitimate simplification directions.

**Success criteria**: The simplification scope is explicit and appropriate for a local cleanup workflow.

## Step 1: Understand behavior and establish a baseline

Read the real code before editing:

- target file or files
- nearby callers, exports, and adjacent helpers
- existing tests covering the target behavior

Then identify:

- inputs and outputs
- side effects and persistence boundaries
- error handling and guard clauses
- externally visible contracts that must not change

Verification baseline:

- run the narrowest relevant tests, type check, lint target, or build step when feasible
- if no narrow verification exists, state that explicitly and proceed more conservatively

Runtime-specific rule:

- do not mechanically block on rereading `CLAUDE.md` every time
- Claude Code already injects the `CLAUDE.md` hierarchy into conversation context via `getUserContext`
- read extra local docs only when the target area has its own conventions or the surrounding code is ambiguous

**Success criteria**: The current behavior and the verification baseline are clear before edits begin.

## Step 2: Identify simplification candidates

Look for changes that reduce local complexity without turning into a redesign:

- flatten deep nesting with guard clauses or early returns
- extract hard-to-read expressions into named variables or helpers
- rename misleading or cryptic local symbols
- eliminate dead code and unused branches
- consolidate obvious duplication
- simplify boolean logic and conditional branching
- reduce parameter sprawl where call sites stay understandable

For each candidate, record:

- location
- category
- risk: `low`, `medium`, or `high`
- required verification

Load `references/simplification-patterns.md` for the detailed pattern catalog, anti-patterns, and risk guidance.

**Success criteria**: A concrete candidate set exists, ordered by risk and expected value.

## Step 3: Choose the smallest safe change set

Default behavior:

- apply low-risk and clearly beneficial simplifications directly
- batch related edits by file or tightly coupled call sites
- prefer one small clean pass over a broad "cleanup everything" sweep

Ask the user before proceeding when:

- the best simplification path is not obvious
- the change is medium/high risk
- multiple unrelated cleanup opportunities are present and scope needs a choice
- a rename or extraction crosses a broad public surface

Do not require a ceremonial before/after approval step for trivial, obviously safe cleanups.

**Success criteria**: The intended edits are limited, justifiable, and proportionate to the user request.

## Step 4: Apply the simplifications

Make changes in the safest order:

1. dead code removal and trivial boolean cleanup
2. flattening and local extraction
3. duplication consolidation
4. broader renames or small helper extraction

Rules during editing:

- preserve function signatures unless the user explicitly wants broader cleanup
- preserve error handling and observable side effects
- search for references before renaming shared symbols
- if a helper file must be created, keep it adjacent and narrowly scoped
- stop if the cleanup starts cascading into architecture work

**Success criteria**: The requested simplifications are implemented without unintended scope expansion.

## Step 5: Verify behavior is preserved

Rerun the narrowest relevant checks from Step 1:

- targeted tests first
- type check or compile step if relevant
- broader checks only if the touched area requires them

Then confirm:

- the baseline still passes
- no new type or syntax errors were introduced
- the code is actually clearer, not just shorter

If a simplification causes regressions or ambiguous fallout:

- revert the last risky change
- keep the safe improvements
- report the blocked candidate instead of forcing it through

**Success criteria**: Verification matches or improves on the baseline without behavior changes.

## Guardrails

- Do not use this skill proactively for unrelated work.
- Do not add features, comments, or architectural refactors under the label of simplification.
- Do not simplify generated code.
- Do not simplify tests unless the user asked for test cleanup specifically.
- Do not optimize for fewer lines; optimize for lower cognitive load.
- Do not add `disable-model-invocation`; the model must be able to invoke this skill when the user explicitly asks for simplification.
- Do not add `context: fork`; this workflow edits the current working context and benefits from inline execution.
- Do not add `paths:`; this is a generic workflow skill, not a path-activated domain reference.
- Do not keep the full pattern catalog inline in `SKILL.md`.

## When To Load References

- `references/simplification-patterns.md`
  Use for detailed pattern examples, risk guidance, anti-patterns, and escalation heuristics when the target code is non-trivial.

## Output Contract

Report:

1. resolved scope
2. baseline checks run, or explicit verification gap
3. simplifications applied by file and category
4. verification results
5. skipped or deferred opportunities and why
