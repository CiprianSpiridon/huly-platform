# Workspace Discovery

Use this reference when `map-project-monorepo/SKILL.md` needs the workspace detection and discovery rules without carrying the monorepo matrix inline on every invocation.

## Detection Order

Check in this order:

1. Cargo workspace: root `Cargo.toml` contains `[workspace]`
2. Node.js / TypeScript monorepo: root `package.json` with `workspaces`

If both exist, choose the workspace shape that matches the requested refresh scope and note the mixed topology explicitly.

## Member Inventory

For every in-scope member, collect:

- member name
- member path
- actual exported or reachable surface
- key files
- wiring files
- inter-member dependencies
- tests, benchmarks, or runtime entry points
- a one-line role summary

## Cargo Workspace Discovery

Inventory:

- workspace members
- crate roots and manifests
- actual exported surface through `lib.rs`, `main.rs`, re-exports, and feature flags
- inter-crate dependencies
- tests and benches
- runtime entry points and real consumers

Important rule:

- raw `pub` counts are only a discovery aid
- document what consumers can actually reach, not every internally visible item

## Node Monorepo Discovery

Inventory:

- packages or apps
- package entry points
- actual exports and subpath exports
- barrels and registration files
- inter-package dependencies
- tests and runtime entry points
- real consumer import patterns

Important rule:

- raw `export` counts are only a discovery aid
- document what consumers can actually import or execute, not every internal symbol

## Wiring Rules

For each member, explicitly identify files that make behavior reachable:

- crate roots or package entry points
- manifests and feature flags
- barrels
- startup/bootstrap files
- registries, routers, or plugin hooks

If a future code change would need that file to make new behavior reachable, it belongs in the member doc.

## Root Simplification Rule

Root should keep:

- project-wide rules
- locked architecture decisions
- workspace layout and member purposes
- global testing or build policy

Root should not keep:

- member-local API tables
- member-local file lists
- detailed per-member wiring notes
