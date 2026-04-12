# PR Retro Metrics

Use this reference when `pr-retro/SKILL.md` needs the detailed metrics, scan patterns, and output schema without carrying them inline on every invocation.

## Mode Resolution

Supported modes:

- standard: full retro plus JSON snapshot
- `--quick`: dashboard-only, no snapshot
- `--base <branch>`: override base branch selection

Base branch priority:

1. explicit `--base`
2. `origin/main`
3. `origin/master`
4. ask the user if neither exists

## Core Metrics

Compute:

- total commits
- contributors
- files changed
- insertions
- deletions
- net LOC
- test insertions
- test LOC ratio
- PR size class
- branch age
- base drift

Suggested PR size buckets:

- `XS`: <10 changed lines
- `S`: 10-99
- `M`: 100-499
- `L`: 500-999
- `XL`: 1000+

## Contributor And Hygiene Metrics

Per contributor:

- commits
- insertions
- deletions
- files changed
- commit type breakdown
- sessions

Hygiene checks:

- WIP/fixup/squash style commits
- conventional-commit compliance
- empty or weak commit messages

## Focus And Session Analysis

Focus score:

- derive the primary directory concentration from changed files
- higher means more concentrated changes

Sessions:

- use a 45-minute gap threshold between commits
- compute session count and timeline

## Self-Review Scan Patterns

### BLOCK

- hardcoded secrets
- `.only` test markers
- conflict markers

### WARN

- debug statements
- TODO / FIXME / HACK / XXX in added lines
- suspicious commented-out code

### INFO

- large newly added files
- binary files
- notable root-level config changes

Never print actual secret values.

## Verdict Signals

Evaluate each signal:

| Signal | GREEN | YELLOW | RED |
|--------|-------|--------|-----|
| Hygiene | Score >= 0.9 | Score >= 0.7 | Score < 0.7 |
| Size | XS, S, or M | L | XL |
| Test ratio | >= 0.2 | >= 0.1 | < 0.1 (and insertions > 50) |
| Focus | Score >= 0.6 | Score >= 0.3 | Score < 0.3 |
| Self-review | 0 BLOCKs, 0-2 WARNs | 0 BLOCKs, 3+ WARNs | Any BLOCKs |
| Drift | <= 20 commits behind | 21-50 commits behind | > 50 commits behind |

Overall verdict:

- any RED signal forces overall RED
- 2+ YELLOW signals forces overall YELLOW
- at most 1 YELLOW signal = GREEN

Always produce recommendations for non-green signals.

## Output Sections

Always render:

- dashboard summary
- verdict

In standard mode also render:

- contributors
- commit type breakdown
- hotspots
- self-review findings
- time distribution
- recommendations

## JSON Snapshot Schema

Write snapshot to:

- `.history/pr-retros/<branch-slug>.json`

Include:

- version
- timestamp
- branch
- baseBranch
- branchAge
- contributors
- metrics
- commitTypes
- hotspots
- commitHygiene
- focusScore
- selfReview
- sessions
- verdict

Skip snapshot generation in `--quick` mode.

## Forked Execution Rationale

`pr-retro` is a good candidate for:

- `context: fork`
- `agent: general-purpose`
- higher effort than default

Why:

- it is long-running analysis
- it is read-mostly
- it does not require mid-process user interaction
- it benefits from separate reasoning budget and isolation from the main implementation flow

Relevant runtime anchors:

- `claude-code-source/src/tools/SkillTool/SkillTool.ts`
- `claude-code-source/src/utils/forkedAgent.ts`
- `claude-code-source/src/skills/loadSkillsDir.ts`
