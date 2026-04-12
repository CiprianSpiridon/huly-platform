# Agent Runtime Semantics

Use this reference when `run-parallel-agents-feature-build/SKILL.md` needs the exact Claude Code runtime rules for spawning and coordinating agents in parallel.

## Fresh Agent Context

Fresh agents launched with `subagent_type` do not inherit your task-specific reasoning. Their prompt must include:

- what to do
- why it matters
- target files or directories
- scope boundaries
- expected output
- validation requirements

Relevant source anchors:

- `claude-code-source/src/tools/AgentTool/prompt.ts`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx`

## Parallel Launch Rule

If the user asks for agents "in parallel", launch them in a single assistant message with multiple `Agent(...)` tool use blocks.

Why:

- this is the runtime behavior Claude's own Agent tool prompt requires
- splitting launches across multiple assistant messages turns the orchestration into serial work from the coordinator's perspective

Relevant source anchor:

- `claude-code-source/src/tools/AgentTool/prompt.ts:258-271`

## Background Semantics

For independent lanes, use `run_in_background: true`.

Why:

- background agents notify the main thread on completion
- the coordinator should not sleep, poll, or proactively inspect progress

Relevant source anchors:

- `claude-code-source/src/tools/AgentTool/prompt.ts:260-264`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:420-422`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:548-567`

## Worktree Isolation

For code-writing lanes, prefer `isolation: "worktree"`.

Why:

- worktree isolation gives the agent a temporary git worktree
- it reduces file clobbering across parallel writers
- explicit `isolation` on the Agent call overrides any default isolation on the target agent definition

Relevant source anchors:

- `claude-code-source/src/tools/AgentTool/prompt.ts:271-273`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:424-431`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:582-590`

## Explicit Parameters Beat Defaults

Do not rely on agent-file defaults when the orchestration needs predictable semantics.

Important behavior:

- explicit `isolation` overrides the selected agent's `isolation`
- `run_in_background: true` combines with agent defaults and is the safest explicit signal for independent parallel work

Relevant source anchors:

- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:424-431`
- `claude-code-source/src/tools/AgentTool/AgentTool.tsx:548-567`

## Output Handling

The agent result is returned to the coordinator, not directly to the user.

That means:

- aggregate results yourself
- report concise summaries back to the user
- do not assume the user saw raw agent output

Relevant source anchor:

- `claude-code-source/src/tools/AgentTool/prompt.ts:253-256`
