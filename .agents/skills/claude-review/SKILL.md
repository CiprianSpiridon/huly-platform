---
name: claude-review
version: 2.0.0
description: |
  Launch an isolated Claude reviewer for the current branch, a specific commit, or uncommitted
  changes. Uses Claude's agent runtime with worktree isolation so the review has an independent
  read-only view of the code before findings are reported back.
allowed-tools:
  - Bash
  - Read
  - Agent
disable-model-invocation: true
user-invocable: true
argument-hint: "[branch review, last commit, or uncommitted]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks for a Claude review or a self-review pass. Examples:
  "/claude-review", "run a Claude review on this branch", "self-review the last commit". Do not
  use for direct code fixing or when the user asked for Codex or Kiro instead.
effort: high
---

<EXTREMELY-IMPORTANT>
This skill is review orchestration, not code editing.

Non-negotiable rules:
1. Read the real diff before building the reviewer prompt.
2. Always use isolated review execution.
3. Tell the reviewer to report only, never modify code.
4. Carry forward exclusion lists on repeated rounds so fixed findings are not re-reported.
5. Verify returned findings before acting on them.
</EXTREMELY-IMPORTANT>

# Claude Review

## Inputs

- `$request`: Optional scope hint such as `last commit`, `uncommitted`, `auth focus`, or `round 2`

## Goal

Create a focused Claude review that:

- derives its scope from the real diff
- gives the reviewer the right focus areas
- runs in isolation from the main working tree
- returns actionable findings without changing code

## Step 0: Resolve the review scope

Determine whether the user wants:

- full branch review
- last-commit review
- uncommitted review
- targeted review of a subsystem or recent task

Read the relevant diff summary and changed-file list before building the prompt.

If there is nothing to review, stop and say so explicitly.

**Success criteria**: The review scope is explicit and backed by a real diff.

## Step 1: Build a focused review brief

Use the diff to identify:

- changed files
- changed directories or subsystems
- likely risk areas such as auth, secrets, concurrency, shelling out, migrations, or tests
- issues already fixed in previous rounds that should not be re-reported

The prompt should include:

- review base and scope
- changed-file list
- focused risk areas
- explicit report-only instruction
- desired output format

**Success criteria**: The reviewer brief is specific to the actual changes, not generic boilerplate.

## Step 2: Launch the isolated reviewer

Use `Agent` with:

- `subagent_type: general-purpose`
- `isolation: "worktree"`
- a prompt that says:
  - read the full diff
  - read surrounding file context
  - verify each finding before reporting
  - do not make code changes
  - report findings as a markdown table:
    `| # | Priority | File:Line | Description | Suggested Fix |`
  - priority levels: P1 (crash/security), P2 (incorrect behavior), P3 (minor)
  - if nothing significant is found, say so explicitly

If the review is expected to take a while, background execution is acceptable, but keep the scope tight enough that the reviewer stays focused.

**Success criteria**: The review runs in an isolated worktree and cannot mutate the active working copy.

## Step 3: Parse and summarize findings

Report:

- scope reviewed
- findings grouped by priority
- file and line references
- explicit clean result when no material findings are returned

Treat reviewer output as candidate findings, not automatic truth. If the user wants fixes, verify each finding locally first.

**Success criteria**: The user gets a readable review summary without needing to parse raw agent output.

## Step 4: Iterate only when useful

On a second or later round:

- include previously fixed findings in the exclusion list
- tighten the review focus to new or modified areas
- avoid rerunning a generic full-branch review if only a few files changed

**Success criteria**: Each new round looks for genuinely new issues instead of rehashing old ones.

## Comparison with Sibling Skills

| Skill | Tool | Best For |
|-------|------|----------|
| `/claude-review` | Claude Code (Agent) | Deep code understanding, context-aware review |
| `/codex-review` | OpenAI Codex CLI | Independent perspective, repro scripts |
| `/kiro-review` | Kiro CLI | Alternative AI perspective |

For critical code, run all three and cross-reference findings. The overlap between reviewers catches more bugs than any single tool.

## Guardrails

- Do not add `context: fork`; this skill already uses the agent runtime directly.
- Do not let the reviewer edit code.
- Do not skip diff reading before prompt construction.
- Do not include real secret values in the prompt or summary.
- Do not run this skill proactively; it is explicit-user-only.

## Output Contract

Report:

1. review scope
2. changed areas emphasized in the prompt
3. findings by priority with `file:line`
4. explicit clean result if no significant findings were returned
5. whether a later review round should exclude prior fixed issues
