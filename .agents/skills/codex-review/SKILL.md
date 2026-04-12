---
name: codex-review
version: 2.0.0
description: |
  Run OpenAI Codex CLI as an independent reviewer over the current branch, a specific commit, or
  uncommitted changes. Builds a focused instruction file from the real diff and returns a compact
  review summary.
allowed-tools:
  - Bash
  - Read
disable-model-invocation: true
user-invocable: true
argument-hint: "[branch review, uncommitted, or specific commit]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks for a Codex review or cross-review. Examples:
  "/codex-review", "run codex on this branch", "get a second opinion from codex". Do not use for
  direct code editing or when the user asked for Claude or Kiro instead.
effort: high
---

<EXTREMELY-IMPORTANT>
This skill orchestrates an external reviewer and must stay disciplined.

Non-negotiable rules:
1. Read the real diff before writing Codex instructions.
2. Make the instructions specific to the changed areas and likely risks.
3. Never pass secrets or credential values into review instructions.
4. Carry forward exclusion lists on later rounds.
5. Verify returned findings before acting on them.
</EXTREMELY-IMPORTANT>

# Codex Review

## Inputs

- `$request`: Optional scope hint such as `last commit`, `uncommitted`, `auth focus`, or `round 2`

## Goal

Use `codex review` to get an external review pass that:

- reads the right diff scope
- focuses on the actual risk areas in the change set
- returns structured findings instead of generic commentary

## Step 0: Verify Codex availability

Check:

- `which codex`
- whatever minimal auth or environment check is needed for the current setup

If the CLI is unavailable or not authenticated, explain the blocker and stop.

**Success criteria**: Codex can be invoked successfully from the current repository.

## Step 1: Resolve review scope

Determine whether to review:

- the full branch against its base
- uncommitted changes
- a specific commit

Read the real diff summary and changed-file list before building instructions.

If there is no diff, stop and say so explicitly.

**Success criteria**: The exact review target is explicit and backed by a real diff.

## Step 2: Write focused review instructions

Build a small temporary instruction file that includes:

- what changed
- the most relevant risk areas
- any previously fixed issues to exclude on later rounds
- an instruction to verify findings against the actual code
- a compact expected output format

Keep the instructions concrete. Generic prompts produce weak reviews.

**Success criteria**: The instruction file is specific to the actual change set.

## Step 3: Run `codex review`

Use the right invocation shape for the selected scope:

- `--base <branch>` for branch review
- `--uncommitted` for working-tree review
- `--commit <sha>` for a single commit

Key flags:

- `sandbox_permissions` -- codex needs disk read access to verify findings:
  `-c 'sandbox_permissions=["disk-full-read-access","disk-full-write-access","network-full-access"]'`
- `instructions` -- point to the focused instruction file from Step 2:
  `-c 'instructions="/tmp/codex-review-instructions.md"'`
- `--title "<description>"` -- descriptive review title

Always capture stderr with `2>&1` (codex logs to stderr).

If the review is expected to be long-running, background execution is acceptable.

**Success criteria**: Codex runs against the intended scope and returns parseable output.

## Step 4: Summarize findings

Report:

- review scope
- findings by priority
- file and line references when available
- explicit clean result when no material findings are returned

If the user wants fixes, verify each finding locally before changing code.

**Success criteria**: The user gets a clear, scoped review summary instead of raw CLI output.

## Step 5: Iterate only with exclusions

On later rounds:

- add fixed findings to the exclusion section
- narrow the scope to new changes where possible
- avoid paying for repeated generic full-branch reviews

**Success criteria**: Follow-up rounds look for new issues rather than re-reporting old ones.

## Guardrails

- Do not run this skill proactively; it is explicit-user-only.
- Do not put secrets, tokens, or private config values in the instruction file.
- Do not trust findings blindly without local verification.
- Do not use Codex review as a substitute for reading the diff first.

## Output Contract

Report:

1. the review scope
2. the main focus areas given to Codex
3. findings by priority with locations when available
4. explicit clean result if nothing material was found
5. whether a next round should exclude previously fixed issues
