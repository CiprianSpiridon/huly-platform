# Output Contract

Use this reference when `map-project-monorepo/SKILL.md` needs the required section contract, size targets, and verification gates without carrying them inline on every invocation.

## Required Outputs

Refresh:

- root `CLAUDE.md`
- each in-scope member `CLAUDE.md`

If the workspace already uses an equivalent checked-in memory structure, preserve it and adapt the refresh instead of forcing a new layout blindly.

## Member File Expectations

Each member `CLAUDE.md` should cover:

- purpose
- public or exported surface
- key files
- dependencies
- wiring and entry points
- usage pattern
- architecture notes
- testing guidance

Use:

- `package-template.md` for library-style members
- `app-template.md` for apps, binaries, servers, or entrypoint-heavy members

## Root File Expectations

Root `CLAUDE.md` should stay thin:

- project-wide rules
- locked architectural decisions
- workspace layout
- global testing or build guidance
- routing to member-local docs

Do not duplicate member-local API inventories or file tables in root.

## Budget Rules

Target limits:

- root `CLAUDE.md`: under 300 lines
- each member `CLAUDE.md`: under 200 lines

If over budget:

- replace prose with tables or bullet lists
- remove duplication
- keep root project-wide and push detail down to members

## Verification Gates

Before completion, confirm:

- every in-scope member has a `CLAUDE.md`
- member docs describe the real reachable surface
- hidden wiring files are documented where relevant
- root no longer duplicates member-local detail heavily
- budget targets remain sane
- a future agent could work inside a member without searching blind for exports, entry points, or tests

If any gate fails, tighten and rerun the refresh instead of calling it complete.
