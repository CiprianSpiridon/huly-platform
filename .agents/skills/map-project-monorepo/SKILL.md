---
name: map-project-monorepo
version: 3.0.0
description: |
  Scan a Cargo workspace or package monorepo and refresh per-member `CLAUDE.md` files plus a thin
  root `CLAUDE.md`. User-only maintenance workflow for keeping workspace-local AI context accurate
  after refactors, member additions, export changes, or major architectural shifts.
allowed-tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
disable-model-invocation: true
user-invocable: true
argument-hint: "[workspace scope or refresh target]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to refresh workspace or monorepo documentation, regenerate
  per-member `CLAUDE.md` files, or sync the root and member memory files with the real repository
  shape. Examples: "/map-project-monorepo", "refresh all crate docs", or "update the monorepo
  CLAUDE files after the refactor". Do not use proactively after routine edits.
---

<EXTREMELY-IMPORTANT>
This skill mutates durable project memory across multiple workspace members. Non-negotiable rules:
1. Discover the real workspace shape before writing any member `CLAUDE.md`.
2. Document the actual exported or reachable surface, not raw visibility markers alone.
3. Keep each member file self-contained enough for Claude's lazy-loading model.
4. Preserve root-level project rules and locked architectural decisions unless discovery proves them stale.
5. Do not run this skill proactively; it is explicit-user-only maintenance.
</EXTREMELY-IMPORTANT>

# Map Project Monorepo

## Inputs

- `$request`: Optional scope or refresh note such as `all crates`, `only packages/api-*`, or `refresh workspace docs after adding the sql crate`.

## Goal

Refresh the root and per-member `CLAUDE.md` files so each workspace member has accurate, self-contained local guidance and the root stays thin and project-wide.

## Step 0: Resolve workspace scope and detect monorepo shape

Determine:

- whether the repo is a Cargo workspace or a package monorepo
- whether the user wants a full refresh or a scoped member refresh
- which members exist and which already have `CLAUDE.md` files
- which root-level memory files and architectural rules already exist and should be preserved

Load `references/workspace-discovery.md` for:

- workspace detection order
- member inventory expectations
- discovery rules for exported surface, wiring, and dependency mapping

Stop early if:

- the workspace shape cannot be identified
- the target member set is too ambiguous to update safely

**Success criteria**: The workspace shape and refresh scope are explicit before discovery starts.

## Step 1: Discover members, public surface, and wiring

For every in-scope member, inventory:

- actual exported or reachable surface
- key source files
- wiring files such as crate roots, package entry points, manifests, barrels, startup hooks, registries, routers, or feature flags
- inter-member dependencies
- tests, benchmarks, or runtime entry points
- real consumer usage patterns when available

Rules:

- do not equate raw `pub` or raw `export` counts with the real public surface
- verify what consumers can actually reach first
- prefer actual imports, re-exports, and runtime registration points over guesses
- preserve existing member docs when they are still correct; extend or tighten them instead of regenerating blindly

Load `references/workspace-discovery.md` and complete the relevant discovery steps for the detected monorepo shape.

**Success criteria**: You have enough concrete inventory to write self-contained member docs without placeholders or false surface claims.

## Step 2: Refresh per-member `CLAUDE.md` files

For each in-scope member, update or create a focused local `CLAUDE.md` that covers:

- purpose
- public or exported surface
- key files
- dependencies
- wiring and entry points
- usage pattern
- architecture notes
- testing guidance

Load:

- `references/output-contract.md` for required sections, size targets, and verification rules
- `references/package-template.md` for library or package members
- `references/app-template.md` for apps, binaries, or entrypoint-heavy members

Writing rules:

- use real workspace examples, not placeholders
- keep tables and bullets preferred over repetitive prose
- make each member file self-contained for Claude's lazy-loading behavior
- document hidden wiring points if a future change would need them to make behavior reachable

**Success criteria**: Every targeted member has an accurate, self-contained `CLAUDE.md`.

## Step 3: Simplify the root `CLAUDE.md`

Treat the root file as the project-wide router:

- keep project-wide rules, locked decisions, testing policy, and workspace layout
- remove member-specific API tables or file listings from root
- ensure the root points clearly to member-local docs rather than duplicating them

Rules:

- preserve root-level architectural constraints and steering decisions
- do not erase useful human-authored global rules
- move member detail down instead of letting the root become a second copy of every member file

Load `references/output-contract.md` for the root-file expectations and budget rules.

**Success criteria**: Root stays thin and project-wide while member detail lives where Claude will lazy-load it.

## Step 4: Verify coverage, self-containment, and budget

Validate the refresh before declaring completion:

- every in-scope member has a `CLAUDE.md`
- member docs describe the real reachable surface, not just raw visibility markers
- wiring and entry points are documented where relevant
- root no longer duplicates member-local details heavily
- line budgets remain sane
- the refreshed docs would let an implementation agent work in a touched member without searching blindly

Load `references/output-contract.md` for verification gates and budget targets.

If verification fails:

- improve coverage
- restore missing sections
- tighten duplicated content
- correct stale reachability or wiring claims

**Success criteria**: The workspace memory is compact, member-local, and actually useful to future agents.

## Step 5: Report what changed

Summarize:

- detected workspace shape
- members refreshed
- files created or updated
- coverage or inventory highlights
- budget status
- intentionally deferred or out-of-scope members

Do not claim a perfect refresh if the workspace is only partially covered or if the requested scope excluded some members.

**Success criteria**: The user gets a clear summary of what workspace memory was refreshed and how complete it is.

## Guardrails

- Do not use this skill proactively; it is explicit-user-only because it mutates durable project memory.
- Do not add `context: fork`; this workflow writes into the active repository.
- Do not add `paths:`; this is a generic maintenance skill.
- Do not overwrite useful root-level project rules without evidence they are stale.
- Do not keep workspace discovery matrices, template encyclopedias, or quality scorecards inline in `SKILL.md`.
- Do not bloat the root `CLAUDE.md`; push member detail down.
- Do not mark the refresh complete without verifying self-containment and reachability.

## When To Load References

- `references/workspace-discovery.md`
  Use for workspace detection order, member discovery rules, and exported-surface versus raw-visibility guidance.

- `references/output-contract.md`
  Use for required member/root sections, budget rules, and verification gates.

- `references/package-template.md`
  Use when refreshing library-style members.

- `references/app-template.md`
  Use when refreshing binaries, apps, servers, or entrypoint-heavy members.

## Output Contract

Report:

1. detected workspace shape and scope
2. members refreshed
3. files created or updated
4. coverage and self-containment summary
5. budget and verification result
6. deferred or intentionally skipped members
