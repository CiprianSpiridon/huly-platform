---
name: update-claude-settings
version: 2.0.0
description: |
  Detect the real project stack and generate or update Claude Code settings files such as
  `.claude/settings.local.json`, `.claude/settings.json`, and `.mcp.json`. User-only maintenance
  workflow for permission and integration configuration.
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
disable-model-invocation: true
user-invocable: true
argument-hint: "[settings focus or stack hint]"
arguments:
  - request
when_to_use: |
  Use only when the user explicitly asks to audit, generate, or update Claude Code settings or
  MCP configuration. Examples: "/update-claude-settings", "audit settings", "configure Claude
  permissions", or "update .mcp.json suggestions". Do not use for running project commands, code
  changes, or general stack discovery with no settings intent.
---

<EXTREMELY-IMPORTANT>
This skill updates durable Claude configuration and must stay evidence-driven.

Non-negotiable rules:
1. Detect the actual stack from repository files before recommending any command.
2. Read existing `.claude/settings.json`, `.claude/settings.local.json`, and `.mcp.json` before proposing changes.
3. Only include commands and integrations for tools actually detected in the project.
4. Exclude destructive system commands, absolute paths, and user-specific paths.
5. Get explicit user approval before writing any settings file.
</EXTREMELY-IMPORTANT>

# Update Claude Settings

## Inputs

- `$request`: Optional guidance such as local vs shared settings, stack hints, or requested integrations

## Goal

Generate a credible settings update by:

- detecting the real toolchain and frameworks
- comparing that stack against current Claude settings
- proposing only the needed command permissions, domains, and MCP integrations
- getting approval before writing
- validating the resulting JSON files

## Step 0: Resolve target mode

Determine what the user wants to update:

- `.claude/settings.local.json`
- `.claude/settings.json`
- `.mcp.json`
- audit-only recommendations without writing

Default behavior:

- prefer `.claude/settings.local.json` for user-local permissions
- use `.claude/settings.json` only when the user explicitly wants shared project settings
- update `.mcp.json` only when detected integrations justify it

**Success criteria**: The target files and whether this is audit-only or write mode are explicit.

## Step 1: Detect the real stack

Inspect the repository root and relevant config files to identify:

- languages
- package managers
- frameworks
- build tools
- monorepo shape
- service integrations
- project-local CLIs or infrastructure tools

Load `references/stack-detection.md` for indicator files and detection rules.

Rules:

- detect from real files, not assumptions
- prefer lock files over guesses for package manager selection
- use dependency manifests to confirm frameworks and integrations
- if the repo is effectively empty, stop and ask the user for the intended stack instead of fabricating settings

**Success criteria**: The detected stack is explicit and supported by real files.

## Step 2: Read current settings and identify gaps

Read existing:

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.mcp.json`

Capture:

- currently allowed commands
- denies or user customizations that must be preserved
- stale commands for tools no longer present
- missing commands for tools that are present

Rules:

- do not overwrite existing settings blindly
- preserve user intent where possible
- keep shared vs local settings distinct

**Success criteria**: The current config state and the gap against the detected stack are understood.

## Step 3: Build recommendations

Build the recommendation set from:

- baseline safe commands
- stack-specific commands
- package-manager-specific commands
- framework-specific commands
- documentation domains
- MCP suggestions for detected services

Load:

- `references/command-catalog.md` for command selection
- `references/webfetch-and-mcp.md` for domains and MCP suggestions
- `references/output-contract.md` for output structure and file-target rules

Rules:

- only include commands for detected tools
- include the correct development commands Claude actually needs, not just read-only inspection commands
- exclude competing package-manager commands unless multiple managers are truly present
- do not suggest GitHub MCP; use `gh` CLI instead

**Success criteria**: The recommendation set matches the detected stack and contains no stale or unsafe entries.

## Step 4: Present the recommendation and confirm

Before writing, present:

- detected stack summary
- target files
- recommended command categories
- domains and MCP suggestions
- additions, removals, and unchanged areas when current settings already exist

Use `AskUserQuestion` if the user needs to choose between:

- local vs shared settings
- audit-only vs apply
- selective vs full application

Do not write until the user explicitly approves the update.

**Success criteria**: The user has approved the intended settings changes.

## Step 5: Write the approved files

Apply the minimal correct edit to the approved targets.

Rules:

- preserve existing customizations unless they directly conflict with detected reality
- keep local settings local and shared settings shared
- write `.mcp.json` only when there is a concrete detected integration or an explicit user request
- do not introduce comments into JSON files

**Success criteria**: The approved settings changes are written to the correct files.

## Step 6: Verify and report

Verify:

- each written JSON file parses correctly
- command permissions match the detected stack
- no destructive/system-level commands slipped in
- package-manager permissions match the real lock files
- target files are the ones the user approved

Report:

- detected stack
- files written or left unchanged
- command/domain/integration counts
- any preserved customizations or unresolved ambiguities

**Success criteria**: The user can see exactly what changed and the files are valid.

## Guardrails

- Do not let the model invoke this skill proactively; it mutates durable config.
- Do not add `context: fork`; this workflow edits the active repository.
- Do not add `paths:`; this is a generic maintenance skill.
- Do not keep giant command tables, framework matrices, or long failure catalogs inline in `SKILL.MD`.
- Do not add commands for undetected tools.
- Do not include destructive system commands, absolute paths, or user-specific paths.
- Do not write any file without explicit approval.

## When To Load References

- `references/stack-detection.md`
  Use for lock-file, framework, service, and monorepo detection.

- `references/command-catalog.md`
  Use for baseline commands, stack-specific commands, and package-manager exclusion rules.

- `references/webfetch-and-mcp.md`
  Use for documentation domains and MCP server suggestion rules.

- `references/output-contract.md`
  Use for output format, target-file selection, merge policy, and verification requirements.

## Output Contract

Report:

1. detected stack summary
2. target files
3. recommended additions, removals, and unchanged areas
4. whether files were written or only audited
5. JSON verification results and any unresolved ambiguities
