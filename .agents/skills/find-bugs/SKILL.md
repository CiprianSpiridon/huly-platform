---
name: find-bugs
version: 2.0.0
description: |
  Review the current branch diff for real bugs and security issues, verify findings against
  surrounding code, and report only issues that survive context checks. Runs as a forked review
  workflow so the audit has separate reasoning budget and stays isolated from the main task flow.
  Use when the user asks to find bugs, review changes, or audit branch risk.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Skill
context: fork
agent: general-purpose
effort: high
argument-hint: "[review focus]"
arguments:
  - request
when_to_use: |
  Use when the user explicitly asks to review branch changes for bugs, vulnerabilities, or risky
  regressions. Examples: "find bugs", "review my changes", "security review", "audit this branch".
  Do not use for style review, full-repository audit, or direct code fixing.
---

<EXTREMELY-IMPORTANT>
This skill is report-only and must stay evidence-driven.

Non-negotiable rules:
1. Read the full branch diff before reporting findings.
2. Verify each finding against surrounding code and framework behavior.
3. Report only real defects or vulnerabilities, not stylistic opinions.
4. Keep the workflow read-only. Do not edit application code as part of this skill.
5. Use the checklist reference to stay systematic, but do not paste the entire checklist into every invocation.
</EXTREMELY-IMPORTANT>

# Find Bugs

## Inputs

- `$request`: Optional review guidance such as focus area, threat model, or subsystem hint

## Goal

Produce a credible branch review that:

- reads the actual changed code
- maps the relevant attack and defect surfaces
- verifies findings before reporting
- prioritizes real issues by severity
- clearly states clean results when nothing significant is found

## Step 0: Resolve review scope

This skill reviews branch changes, not the full repository by default.

Determine:

- default branch
- whether the review target is the full branch, a commit range, or current diff guidance from the user
- whether the user asked for a focus area such as auth, data integrity, concurrency, or secrets

If there are no changes relative to the review base, stop and say so explicitly.

**Success criteria**: The review scope is explicit and there is actual diff content to inspect.

## Step 1: Read the real diff and changed files

Inspect the review surface with:

- branch diff against the default base
- changed file list
- changed-file context as needed with `Read`

Rules:

- read the actual changed lines, not just `--stat`
- if diff output is too large, read file-by-file against base
- use `Skill` only when a nested helper such as `codemap` materially improves code discovery

**Success criteria**: Every changed file that matters to the review has been read with enough context to reason about it.

## Step 2: Map attack surfaces and defect surfaces

For each changed file, identify the relevant surfaces:

- user inputs
- database queries
- auth and authorization
- session or token handling
- external calls
- crypto or secret handling
- serialization and parsing
- filesystem paths and uploads
- concurrency or state transitions
- edge-case and boundary behavior

Files with low security surface can still contain logic bugs, so do not skip them entirely.

Load `references/review-checklists.md` for the full review matrix.

**Success criteria**: The changed files are grouped by the risks they actually expose.

## Step 3: Run the targeted review checklist

Use `references/review-checklists.md` to evaluate:

- injection
- XSS and unsafe rendering
- authentication and authorization
- session and CSRF handling
- race conditions
- crypto and secret handling
- information disclosure
- denial of service and resource exhaustion
- business-logic correctness
- general logic bugs such as null access, async mistakes, boundary errors, and missing returns

Rules:

- do not assume a framework protects a pattern without checking whether the protection actually applies here
- do not skip checklist sections just because a file "looks simple"
- focus on changed code, but read enough surrounding code to verify the claim

**Success criteria**: Every meaningful checklist area has been evaluated against the actual changed surface.

## Step 4: Verify each candidate finding

Before reporting any issue, check:

- surrounding function and caller context
- whether middleware, helpers, or wrappers already mitigate it
- whether existing tests already cover the scenario
- whether exploitability or incorrect behavior is real in practice

If you cannot verify the finding confidently, drop it or clearly mark the verification gap.

Do not inflate weak suspicions into findings.

**Success criteria**: Every reported issue survives a false-positive check.

## Step 5: Classify and prioritize

Assign severity based on actual impact:

- `Critical`
- `High`
- `Medium`
- `Low`

Prioritize:

- exploitable security issues first
- then correctness and data-integrity bugs
- then lower-risk quality problems that still represent real defects

Load `references/review-checklists.md` for severity guidance.

**Success criteria**: Findings are ordered by real risk rather than by how easy they were to spot.

## Step 6: Report with evidence

For each finding, report:

- `File:Line`
- severity
- category
- concise problem statement
- evidence for why the issue is real
- exploit path or failure path when relevant
- concrete fix direction

Also report:

- files reviewed
- checklist coverage summary
- any areas not fully verified

If no significant findings exist, say so explicitly.

**Success criteria**: Another engineer can act on the report without re-deriving the issue from scratch.

## Guardrails

- Do not edit code as part of this skill.
- Do not report style-only issues.
- Do not invent findings to appear thorough.
- Do not add `disable-model-invocation`; this skill should remain available for proactive review when the user asks for it.
- Do not add `paths:`; this is a generic workflow skill.
- Keep the heavy checklist content in references, not inline in `SKILL.md`.

## When To Load References

- `references/review-checklists.md`
  Use for the detailed security, logic, severity, and reporting checklists.

## Output Contract

Report:

1. files reviewed
2. findings by severity
3. concise detailed findings with evidence
4. checklist coverage and any verification gaps
5. explicit clean result if no significant bugs were found
