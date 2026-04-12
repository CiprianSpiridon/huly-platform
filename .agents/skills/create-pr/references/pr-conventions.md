# PR Conventions

Use this reference when `create-pr/SKILL.md` needs detailed heuristics without loading them into the default invocation path.

## Base Branch Selection

Use this order:

1. explicit user-provided base
2. `origin/main`
3. `origin/master`
4. `origin/develop`
5. ask the user if none exist

## PR Classification Heuristics

Determine:

- `type` from the actual diff, not just the branch name
- `scope` from the dominant changed area when one exists
- `size` from changed-file count
- `risk` from surface area and breaking impact

Suggested size buckets:

- `S`: 1-3 files
- `M`: 4-10 files
- `L`: 11-25 files
- `XL`: 26+ files

Suggested risk buckets:

- `Low`: docs, tests, narrow config
- `Medium`: standard feature or bugfix work
- `High`: migrations, public API changes, auth, core logic, broad refactors

## Breaking-Change Signals

Treat these as breaking-change candidates:

- removed or renamed public exports
- route or API contract changes
- schema or migration changes
- required env var changes
- dependency upgrades with public behavior impact

If present, document them explicitly in the PR body.

## Title Rules

Format:

```text
type(scope): concise description
```

Rules:

- imperative mood
- under 72 characters when possible
- no trailing period
- add `!` if the PR contains breaking changes
- ensure the title reflects the whole branch, not just the last commit

## Body Rules

Required sections:

- `Summary`
- `Test Plan`

Conditional sections:

- `Changes`
- `Breaking Changes`
- `Notes`

Body guidance:

- summary should explain what changed and why
- changes should be grouped by area, not by commit
- test plan should contain concrete reviewer-verifiable scenarios
- breaking changes should include migration or rollout notes when needed

## Option Mapping

Map user intent to `gh pr create` flags:

| User intent | Flag |
| --- | --- |
| draft, WIP | `--draft` |
| assign @user | `--assignee user` |
| review by @user | `--reviewer user` |
| add label X | `--label X` |
| milestone X | `--milestone X` |

## Blocking Vs Warning Rules

Always block on:

- protected branch as source branch
- no commits relative to base
- conflict markers

Usually warn, not block, on:

- typecheck failures
- lint failures
- missing reviewer metadata

Never pretend warnings are green.

## User-Only Rationale

`create-pr` should use `disable-model-invocation` because:

- it mutates remote collaboration state
- it may need explicit user judgment on base branch, reviewers, and release intent
- Claude Code supports user-facing slash skills that remain visible while being blocked from proactive model invocation

Relevant runtime anchors:

- `claude-code-source/src/tools/SkillTool/SkillTool.ts`
- `claude-code-source/src/commands.ts`
- `claude-code-source/src/skills/bundled/debug.ts`
- `claude-code-source/src/skills/bundled/skillify.ts`
