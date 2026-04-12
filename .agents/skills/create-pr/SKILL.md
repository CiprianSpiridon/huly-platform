---
name: create-pr
version: 2.0.0
description: |
  Create a GitHub pull request from the current branch after validating branch readiness, reading
  the real diff, drafting a precise title and body, pushing the branch, and verifying the created
  PR. User-only workflow: use when the user explicitly asks to open or create a PR.
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Glob
  - Grep
  - Skill
disable-model-invocation: true
user-invocable: true
argument-hint: "[PR guidance]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to create or open a pull request. Examples: "create PR",
  "/pr", "open a draft PR", or "push and make a PR". Do not use proactively, do not use for
  branch review only, and do not use when the user only wants a commit or planning.
---

<EXTREMELY-IMPORTANT>
This skill mutates remote collaboration state and must stay explicit.

Non-negotiable rules:
1. Read the full diff against the real base branch before drafting the PR.
2. Block on protected-branch usage, empty branch state, or conflict markers.
3. If uncommitted changes exist, invoke `commit` first instead of creating a misleading PR.
4. Push the branch before creating the PR.
5. Keep PR creation user-driven. If title, scope, base, or reviewer intent is ambiguous, ask first.
</EXTREMELY-IMPORTANT>

# Create PR

## Inputs

- `$request`: Optional PR guidance such as draft intent, reviewer hints, base branch, labels, or title direction

## Goal

Create a PR that matches the actual branch changes and leaves the user with:

- a correct base branch
- an accurate title
- a useful body
- a pushed branch
- a verified PR URL and state

## Step 0: Confirm this is an explicit PR request

This skill is user-only.

Use it only when the user explicitly asks to create or open a PR.

If the request is really:

- code review only, route to a review skill
- commit creation only, route to `commit`
- planning only, route to the planner

If reviewer assignment, labels, milestone, or base branch are ambiguous and matter to the request, use `AskUserQuestion`.

**Success criteria**: PR creation is explicitly requested and the intended PR shape is clear enough to proceed.

## Step 1: Gather real branch context

Inspect the current branch before drafting anything:

- current branch name
- branch tracking state
- uncommitted changes
- base branch candidates
- commits ahead of base
- full diff against base

Rules:

- read the actual diff, not just commit messages
- determine the real base branch before classifying the PR
- use `Read` on changed files when the diff summary is not enough to understand the change

Load `references/pr-conventions.md` for base-branch selection and PR classification heuristics when needed.

**Success criteria**: You know the branch, base, diff shape, and whether the branch is actually PR-ready.

## Step 2: Validate branch readiness

Blockers:

- on `main`, `master`, or `develop`
- no commits relative to base
- conflict markers in changed files

If uncommitted changes exist:

- invoke the `commit` skill
- then re-run branch context gathering before continuing

Warnings:

- type or lint failures are warnings unless the user wants to stop and fix them first
- breaking changes are not blockers, but they must be documented

**Success criteria**: The branch is in a state where a PR can be created honestly.

## Step 3: Classify the PR from the actual diff

Determine:

- type
- scope
- size
- risk
- whether breaking changes exist

Use:

- branch name as a hint, not truth
- changed paths and modules
- commit messages only as supporting context
- the full diff as the source of truth

Document breaking changes if any of these exist:

- removed or renamed public exports
- route or API contract changes
- schema or migration changes
- env var changes
- major dependency changes

Load `references/pr-conventions.md` for:

- classification heuristics
- title rules
- option flag mapping
- blocking versus warning behavior

**Success criteria**: The PR is classified from the real code changes, not just branch naming.

## Step 4: Run the narrowest relevant quality checks

Run checks that fit the changed surface and project tooling.

Typical checks:

- typecheck
- lint
- conflict-marker scan

Rules:

- conflict markers always block
- other failures should be surfaced honestly to the user
- do not fabricate passing status in the PR body
- if the user asks to proceed with known non-blocking issues, say so explicitly in the final report

**Success criteria**: The PR reflects the actual readiness state of the branch.

## Step 5: Draft the PR title and body

Create:

- a Conventional Commit-style PR title
- a body that explains what changed and how to review it

The body should cover:

- summary
- grouped change areas
- breaking changes when present
- specific test plan
- optional notes for deployment, config, or dependency changes

Use:

- `references/pr-conventions.md` for title and readiness rules
- `references/pr-body-examples.md` only when you need example body shape

If the user explicitly provided title guidance, use it if it still matches the actual diff.

**Success criteria**: The title and body describe the full branch accurately and are reviewable.

## Step 6: Push the branch and create the PR

Before creation:

- ensure the branch is pushed
- ensure upstream is set if needed

Then create the PR with `gh pr create`.

Support request-driven options such as:

- draft
- reviewer
- assignee
- label
- milestone

Rules:

- do not create the PR before the branch exists on remote
- prefer `gh` over manual API calls
- if `gh` is unavailable, stop and provide the user with the prepared title, body, and compare URL

**Success criteria**: The PR exists remotely or the user has the exact fallback material needed to create it manually.

## Step 7: Verify and report

After creation, verify:

- PR number
- URL
- title
- state
- draft status
- base branch

Also report:

- whether uncommitted changes remain
- whether the branch is ahead of remote
- whether any warnings were carried into the PR process

**Success criteria**: The user knows exactly what PR was created and any remaining branch caveats.

## Guardrails

- Do not create PRs proactively.
- Do not let the model invoke this skill through SkillTool; this workflow is intentionally user-only.
- Do not add `paths:`. This is a generic workflow skill.
- Do not add `context: fork`. PR state must stay in the active workspace.
- Do not keep giant readiness checklists, scorecards, or failure catalogs inline in `SKILL.md`.
- Do not fabricate test status, branch status, or breaking-change absence.

## When To Load References

- `references/pr-conventions.md`
  Use for base-branch selection, classification heuristics, option parsing, and blocking rules.
- `references/pr-body-examples.md`
  Use only when you need an example PR body shape for a similar request.

## Output Contract

Report:

1. PR number, URL, title, base, and state
2. whether `commit` had to be invoked first
3. the checks run and any warnings that remained
4. any breaking changes documented
5. remaining working-tree or branch state
