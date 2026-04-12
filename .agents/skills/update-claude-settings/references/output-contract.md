# Output Contract

Use this reference when presenting or writing settings changes.

## Target Files

- `.claude/settings.local.json` for user-local permissions
- `.claude/settings.json` for shared project settings when explicitly requested
- `.mcp.json` for MCP server configuration

Prefer local settings unless the user explicitly asks for shared settings.

## Recommendation Format

Present:

1. detected stack summary
2. target files
3. recommended additions
4. recommended removals or stale entries
5. unchanged preserved settings
6. documentation domains and MCP suggestions

## Merge Rules

- Read existing files before proposing changes.
- Preserve user customizations unless they directly conflict with the detected stack.
- Keep local and shared settings conceptually separate.
- Do not silently drop deny rules.

## Write Rules

- Only write after explicit approval.
- Keep JSON valid and comment-free.
- If no changes are needed, say so instead of rewriting the file.

## Verification Rules

After writing:

- validate each JSON file
- confirm package-manager permissions match the real lock files
- confirm no destructive/system-level commands were introduced
- confirm only approved target files were written
