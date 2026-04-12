---
name: start
version: 2.0.0
description: |
  Internal conversation-entry router for Claude Code. Performs a lightweight intake pass at the
  start of substantive work: decide whether a more specific skill should be invoked first, whether
  specialized agent delegation is warranted, how much context is actually needed, and whether the
  task needs planning or can proceed directly. Not a user-facing slash command.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Skill
  - Agent
user-invocable: false
when_to_use: |
  Use internally at the beginning of substantive tasks when no more specific skill has already been
  invoked. Examples: "build X", "fix Y", "implement Z", "review this plan". Do not use for casual
  chat, pure summarization, or when a more specific skill clearly matches and can be invoked
  immediately.
---

<EXTREMELY-IMPORTANT>
This skill is a lightweight router, not a universal constitution.

Non-negotiable rules:
1. If a more specific skill matches, invoke it before giving a substantive task response.
2. Keep intake lightweight. Do not enumerate all skills, agents, and plugins unless the user explicitly asks for a capability inventory.
3. Gather only the minimum context needed to avoid blind edits or duplicated work.
4. Delegate to a specialized agent only when domain expertise or isolation materially improves the result.
5. Use planning and task tracking only when the work is genuinely multi-step, risky, or ambiguous.
</EXTREMELY-IMPORTANT>

# Start

## Goal

Choose the next best execution path at the beginning of a task with minimal prompt overhead.

This skill should answer four questions quickly:

1. Is a more specific skill the real workflow?
2. Is specialized agent delegation warranted?
3. What is the minimum context needed before acting?
4. Does the task need planning, or can it proceed directly?

## Step 1: Check for a more specific skill

Match the user request against domain and workflow skills first.

- If a skill clearly applies, invoke it before explaining the approach.
- If multiple skills may apply, choose the smallest set that covers the task.
- If you are unsure whether a skill matches, read `references/skill_discovery_patterns.md`.
- Do not perform full filesystem skill discovery on every task. Claude already exposes available skills and treats matching skill invocation as a first-class workflow.

**Success criteria**: You either invoked the correct skill, or you can state concretely why no more specific skill applies.

## Step 2: Decide whether to delegate to a specialized agent

Use an agent only when specialization or isolation changes the outcome materially.

Delegate when:

- the task is domain-heavy implementation, debugging, or review work
- a specialized agent has clearly better heuristics for the stack
- the work is large enough that ownership boundaries help

Do not delegate when:

- the work is a trivial read, search, or small direct edit
- the task is only capability discovery
- the next step depends on immediate local inspection

If agent choice is unclear, read `references/agent_matching_logic.md`.

**Success criteria**: You chose either direct execution or a specific agent for a concrete reason.

## Step 3: Gather minimum viable context

Inspect only the code and files needed to avoid blind action.

- Identify the likely files, modules, or subsystems involved.
- Read surrounding code before editing.
- Search for existing implementations or patterns before building from scratch.
- Escalate to broader exploration only if the request is ambiguous or the code surface is unclear.

Use `references/discovery.md` only when:

- the user explicitly asks what skills, agents, or plugins are available
- the environment appears out of sync with the file system
- you need a capability inventory as the actual task output

**Success criteria**: You have enough context to act without forcing broad discovery or redundant reading.

## Step 4: Choose planning depth

Pick the smallest planning mechanism that keeps the work safe.

- Direct execution: trivial, well-bounded requests
- Light task tracking: several steps or files, but straightforward work
- Full DAG planning: ambiguous, risky, architectural, or parallelizable work

If planning is the real task, invoke `plan-to-task-list-with-dag` instead of turning `start` into a giant planner.

**Success criteria**: The task has an execution shape that matches its real complexity.

## Step 5: Communicate the next move

Give a concise first update that states:

- what you think the user wants
- what you are checking first
- whether you are invoking another skill, delegating to an agent, or proceeding directly

If delegating, pass:

- clear scope
- relevant context only
- success criteria

If executing directly, begin with the highest-value context step immediately after the update.

**Success criteria**: The user can see the execution path without reading a long preamble.

## Guardrails

- Do not announce a skill without invoking it.
- Do not use `start` as a substitute for a real domain skill.
- Do not force full capability discovery on normal task intake.
- Do not sync `CLAUDE.md` as part of routine startup.
- Do not create task-tracking noise for trivial work.
- Do not delegate simple search or file-inspection work that should stay local.

## When To Load References

- `references/skill_discovery_patterns.md`
  Use when unsure whether a skill applies, or when several skills overlap.
- `references/agent_matching_logic.md`
  Use when unsure which specialized agent fits the task.
- `references/discovery.md`
  Use only for explicit capability inventory or environment-drift checks.
- `references/sync-claude-md.md`
  Use only when the user explicitly wants the capability section of `CLAUDE.md` refreshed and the session permits file edits.

## Output Contract

On normal invocation, keep the first response short and concrete:

1. state the task understanding
2. state the next action
3. name the invoked skill or delegated agent if one is being used

This skill succeeds when it routes cleanly and then gets out of the way.
