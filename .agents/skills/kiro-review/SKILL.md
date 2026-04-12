---
name: kiro-review
version: 2.0.0
description: |
  Run Kiro CLI as an independent reviewer over the current branch, a specific commit, or
  uncommitted changes. Builds a focused prompt from the real diff and returns a compact review
  summary.
allowed-tools:
  - Bash
  - Read
disable-model-invocation: true
user-invocable: true
argument-hint: "[branch review, uncommitted, or specific commit]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks for a Kiro review or cross-review. Examples:
  "/kiro-review", "run kiro on this branch", "get a second opinion from kiro". Do not use for
  direct code editing or when the user asked for Claude or Codex instead.
effort: high
---

<EXTREMELY-IMPORTANT>
This skill orchestrates an external reviewer and must stay disciplined.

Non-negotiable rules:
1. Read the real diff before writing the Kiro prompt.
2. Make the prompt specific to the changed areas and likely risks.
3. Never put secrets or credentials in the prompt.
4. Carry forward exclusion lists on later rounds.
5. Verify returned findings before acting on them.
</EXTREMELY-IMPORTANT>

# Kiro Review

## Inputs

- `$request`: Optional scope hint such as `last commit`, `uncommitted`, `auth focus`, or `round 2`

## Goal

Use `kiro-cli` to get an external review pass that:

- uses the right diff scope
- focuses on the actual change surface
- returns structured findings instead of generic commentary

## Step 0: Verify Kiro availability

Check:

- `which kiro-cli`
- `kiro-cli whoami` or the minimal auth check needed in this environment

If the CLI is unavailable or not authenticated, explain the blocker and stop.

**Success criteria**: Kiro can run successfully from the current repository.

## Step 1: Resolve review scope

Determine whether to review:

- the full branch
- uncommitted changes
- a specific commit

Read the diff summary and changed-file list first.

If there is nothing to review, stop and say so explicitly.

**Success criteria**: The review target is explicit and backed by a real diff.

## Step 2: Build the focused Kiro prompt

Create a compact prompt that includes:

- what changed
- the major risk areas
- any previously fixed issues to exclude on later rounds
- an instruction to verify findings against the actual code
- the expected compact output format

Avoid generic prompts. They produce weak results.

**Success criteria**: The prompt is specific to the change set rather than reusable boilerplate.

## Step 3: Run Kiro in non-interactive mode

Invoke `kiro-cli chat` with:

- `--no-interactive` -- runs without expecting user input, returns output directly
- `-a` (trust all tools) -- kiro needs file read access to verify findings against source

Always capture stderr with `2>&1` (kiro logs to stderr).

Optional flags:

- `--model <model>` -- specify a particular model if needed
- `--agent <agent>` -- use a specific agent profile for the review

If the run is likely to take a while, background execution is acceptable, but keep the scope tight enough that the review stays focused.

**Success criteria**: Kiro runs on the intended scope and returns parseable findings.

## Step 4: Summarize findings

Report:

- review scope
- findings by priority
- file and line references when available
- explicit clean result when no material findings are returned

If the user wants fixes, verify each finding locally before changing code.

**Success criteria**: The user gets a readable review summary instead of raw CLI logs.

## Step 5: Iterate only with exclusions

On later rounds:

- list prior fixed findings in the exclusion block
- narrow the scope to newly changed files when possible
- avoid repeated full-branch reviews unless the code changed broadly again

**Success criteria**: Follow-up rounds target new issues instead of recycling old ones.

## Guardrails

- Do not run this skill proactively.
- Do not put secrets, tokens, or private config into the prompt.
- Do not trust findings blindly without local verification.
- Do not skip diff reading before prompt construction.

## Output Contract

Report:

1. the review scope
2. the main focus areas given to Kiro
3. findings by priority with locations when available
4. explicit clean result if nothing material was found
5. whether a next round should exclude previously fixed issues
