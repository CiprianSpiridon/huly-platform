---
name: commit
version: 2.0.0
description: |
  Create one or more git commits from the current working tree after reading the diff, scanning
  for obvious blockers, running the narrowest relevant checks, staging explicit files, and
  verifying the result. User-only workflow: use when the user explicitly asks to commit changes.
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Glob
  - Grep
disable-model-invocation: true
user-invocable: true
argument-hint: "[commit guidance]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to create a git commit. Examples: "commit this",
  "/commit", "make a commit", or "commit the current changes". Do not use proactively, do not
  use for PR creation, and do not use when the user only wants status, review, or planning.
---

<EXTREMELY-IMPORTANT>
This skill changes git history and must stay explicit.

Non-negotiable rules:
1. Read the actual diff before drafting a message or staging files.
2. Block on secrets, conflict markers, or clearly unintended files.
3. Stage files explicitly by name. Never use `git add -A` or `git add .`.
4. Run the narrowest relevant checks for the changed surface before committing.
5. Keep commit creation user-driven. If split strategy or file inclusion is ambiguous, ask first.
</EXTREMELY-IMPORTANT>

# Commit

## Inputs

- `$request`: Optional commit guidance such as intent, scope hint, or preferred message wording

## Goal

Produce a clean, intentional commit with:

- an accurate Conventional Commit subject
- explicit staging discipline
- blocker scanning
- relevant verification
- a final report with hash, message, and remaining working-tree state

## Step 0: Confirm this is an explicit commit request

This skill is user-only.

Use it when the user has explicitly asked to commit. If the user only wants review, planning, or PR creation, route to the matching workflow instead.

If the working tree appears to contain unrelated changes and the split is not obvious, use `AskUserQuestion` before mutating git history.

**Success criteria**: The commit action is clearly requested and the intended scope is understood.

## Step 1: Gather the real git context

Before staging anything, inspect the actual state:

- `git status --short`
- `git diff HEAD`
- `git branch --show-current`
- `git log --oneline -15`
- `git status -sb`

Rules:

- read the full diff, not only `--stat`
- use `Read` for specific changed files if a diff section is unclear
- identify whether the changes form one commit or several unrelated commits

**Success criteria**: You understand what changed, where it changed, and whether one commit is sufficient.

## Step 2: Scan for blockers and unwanted files

Check changed files for:

- secrets or credential files
- `.env` or equivalent local-secret files
- conflict markers
- clearly accidental artifacts
- debug leftovers
- unexpectedly large or binary files

Blocking rules:

- conflict markers: stop
- secrets or private credential files: stop and exclude
- ambiguous file inclusion: ask before staging

Warnings:

- debug artifacts may be user-intentional; warn rather than silently strip

Load `references/commit-conventions.md` for the blocker checklist and scan order when needed.

**Success criteria**: No blocking file is about to enter the commit.

## Step 3: Run the narrowest relevant checks

Run only the checks that fit the changed surface and existing project tooling.

Examples:

- TypeScript: typecheck, lint, formatting checks
- Rust: targeted `cargo test` or `cargo clippy` where appropriate
- Go: targeted `go test`
- Python: targeted test or lint commands already used by the repo

Rules:

- prefer changed-surface verification over whole-repo brute force unless the repo only exposes broad checks
- if a check fails on files you are about to commit, stop and resolve or get explicit user direction
- if formatting or auto-fix tools rewrite files, re-evaluate the changed set before staging

**Success criteria**: The changed surface has passed the relevant pre-commit checks, or the user has explicitly approved proceeding despite non-blocking issues.

## Step 4: Draft the commit shape

Determine:

- commit type
- scope
- subject line
- whether a body is needed
- whether the work should be split into multiple commits

Guidelines:

- use the diff, branch name, and recent commit vocabulary to infer scope
- omit scope when the change spans multiple unrelated areas
- add a body only when the subject line is not enough
- if multiple logical commits are required, split by file group and sequence them intentionally

Load `references/commit-conventions.md` for:

- commit type heuristics
- scope detection rules
- body examples

If split strategy is ambiguous, use `AskUserQuestion`.

**Success criteria**: The commit message shape matches the actual changes and the staging plan is explicit.

## Step 5: Stage explicitly and create the commit

Stage only the intended files by name.

Rules:

- never use `git add -A`
- never use `git add .`
- do not include secrets, generated junk, or unrelated edits
- do not use `--amend` unless the user explicitly requested it
- do not use `--no-verify`
- do not use `--allow-empty`

Create the commit with:

- a proper Conventional Commit subject
- an optional body only when needed
- no co-author trailers unless the user explicitly asks

If multiple commits are needed, execute them sequentially and verify each one before the next.

**Success criteria**: The intended files are committed and no unintended files were staged.

## Step 6: Verify and report

After committing, check:

- `git log --oneline -1`
- `git status --short`
- `git status -sb`

Report:

- commit hash
- commit message
- whether the branch is ahead of remote
- any remaining uncommitted files
- whether multiple commits were created

If the working tree still contains unstaged or uncommitted changes, say so explicitly rather than implying the repo is clean.

**Success criteria**: The user can tell exactly what was committed and what state the branch is left in.

## Guardrails

- Do not commit proactively.
- Do not let the model invoke this skill through SkillTool; this workflow is intentionally user-only.
- Do not add `paths:`. This is a generic workflow skill.
- Do not add `context: fork`. Commit state must stay in the active workspace.
- Do not keep giant checklists, scorecards, or failure catalogs inline in `SKILL.md`.
- Do not silently split or exclude files if user intent is unclear.

## When To Load References

- `references/commit-conventions.md`
  Use for commit type mapping, scope detection, blocker scan order, and message/body heuristics.

## Output Contract

Report:

1. whether one commit or multiple commits were created
2. the commit hash and final message for each commit
3. the checks run
4. any blocked or excluded files
5. remaining working-tree or branch state
