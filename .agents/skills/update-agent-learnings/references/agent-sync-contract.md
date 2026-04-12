# Agent Sync Contract

Use this reference when regenerating and syncing the `## Learnings` section into agent files.

## Target Trees

Support both CLI surfaces when present:

- `.agents/agents/*/AGENT.md`
- `.claude/agents/*`

Rules:

- if only one tree exists, sync only that tree
- if both trees exist, sync both
- do not skip a present tree because another one was updated first

## Learnings Section Content

Each synced agent file should contain:

- `### Global Learnings`
- the relevant global categories that exist in the central learnings file
- `### Agent-Specific Learnings`
- matching agent-specific entries, or a clear "no agent-specific learnings yet" line if that is the local convention

Do not copy `Claude Code Only` learnings into subagent prompts.

## Placement Rules

Preferred placement:

- after `## Rules`
- before `## Examples`

If the file already has a `## Learnings` section:

- replace that section cleanly
- avoid rewriting adjacent sections unnecessarily

If the file does not have a `## Learnings` section:

- insert the smallest compatible section at the preferred placement point
- if `## Examples` is absent, place it after the last major rules section rather than reformatting the whole file

## Sync Discipline

- generate the section from the central learnings file each time
- do not append piecemeal if a full clean replacement is safer
- preserve agent-specific prompt content outside the Learnings section
- verify the heading exists after the sync

## Verification Checklist

- central learnings file updated exactly once
- each target tree processed
- each target agent file has one `## Learnings` section
- global learnings present where expected
- agent-specific learnings present only where expected
- no Claude-only learnings propagated into subagent prompts
