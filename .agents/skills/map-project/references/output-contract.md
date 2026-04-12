# Output Contract

Use this reference when `map-project/SKILL.md` needs the required files, section expectations, and verification gates without carrying all of that inline on every invocation.

## Required Files

Refresh these files as appropriate for the project:

- `CLAUDE.md`
- `.claude/claude-md-refs/exports-reference.md`
- `.claude/claude-md-refs/development-guide.md`
- `.claude/claude-md-refs/architecture.md`

If the project already uses a different checked-in reference structure, preserve it and adapt the refresh instead of forcing a new layout blindly.

## Reference File Expectations

### `exports-reference.md`

Should cover the project's real exported or discoverable surface:

- routes, handlers, controllers, or screens
- models, entities, services, hooks, modules, packages, or exports
- enough table structure that future agents can find important surfaces quickly

### `development-guide.md`

Should show how to add or extend features in the repo:

- real implementation steps
- real file locations
- real code patterns from the codebase
- no placeholder templates

### `architecture.md`

Should document:

- dependency or import graph
- request, data, or screen lifecycle
- route or screen map
- stateful flows where they exist
- major subsystems and boundaries

### `CLAUDE.md`

Should stay thin:

- imports or references to the detailed docs
- quick reference for where to look
- project-level rules or conventions that matter on most turns

## Budget Rules

Target limits:

- `CLAUDE.md`: under 1,000 lines
- each imported reference: under 500 lines
- combined imported references: under 1,500 lines
- total memory footprint: under 2,500 lines

If over budget:

- replace long prose with tables
- remove duplication
- move long code examples to file-path references instead of pasting them inline

## Verification Gates

Before completion, confirm:

- required files exist or were intentionally preserved in equivalent form
- expected sections are present
- coverage is high enough for the chosen project shape
- budget targets are still reasonable
- no major duplication exists across memory files
- the refreshed docs would help an implementation agent find routes, exports, and common build patterns

If any gate fails, tighten and rerun the refresh instead of calling it complete.

## What Makes 10/10 Documentation

AI agents are most effective when documentation provides concrete, project-specific patterns rather than generic descriptions.

### Step-by-Step Implementation Guides

Bad (4/10): "We use controllers for API endpoints"

Good (10/10): Numbered steps with actual code templates from the codebase showing Model, Form Request, Controller, Routes, etc.

### Response Formats

Bad: "API returns JSON"

Good: Every response shape with types, including success and error envelopes.

### State Machines with Visual Diagrams

Document stateful entities with ASCII diagrams and transition tables:

```
pending -> fulfilled
    |
cancelled
```

| Current | Action | New State | Who |
|---------|--------|-----------|-----|
| pending | Admin approves | fulfilled | Admin |
| pending | Admin cancels | cancelled | Admin |

### Route / Screen Tables

Bad: "Routes are in the routes folder"

Good: Complete table with route, file, type, and purpose for every route.

### API Surface Tables

Every exported symbol in a table with export name, type, and purpose.

### Quality Rule

If an implementation agent cannot add a new feature by following the development guide step-by-step without guessing, the documentation is incomplete.
