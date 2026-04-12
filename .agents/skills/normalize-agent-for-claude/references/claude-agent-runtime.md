# Claude Code Agent Runtime Anchors

Use these anchors to justify every agent normalization decision.

## 1. The full markdown body becomes the agent system prompt

- `claude-code-source/src/tools/AgentTool/loadAgentsDir.ts:541-562`
  - Agent markdown requires `name` and `description`.
  - `description` becomes `whenToUse`.

- `claude-code-source/src/tools/AgentTool/loadAgentsDir.ts:713-732`
  - `content.trim()` is stored as `systemPrompt`.

- `claude-code-source/src/utils/systemPrompt.ts:77-122`
  - The agent system prompt is what Claude uses as the active system prompt for that agent.

Implication:
- Every extra paragraph in `AGENT.md` is prompt weight, not harmless documentation.
- The body should be role identity and constraints, not a giant workflow manual.

## 2. Claude supports richer agent frontmatter than most custom agents use

- `claude-code-source/src/tools/AgentTool/loadAgentsDir.ts:567-685`
  - Claude parses `model`, `background`, `memory`, `isolation`, `effort`, `permissionMode`,
    `maxTurns`, `tools`, `disallowedTools`, and `skills`.

- `claude-code-source/src/tools/AgentTool/loadAgentsDir.ts:686-711`
  - Claude also parses `initialPrompt`, `mcpServers`, and `hooks`.

Implication:
- Runtime controls should move into frontmatter where possible instead of being re-explained in prose.

Agent-native frontmatter:

- `name`
- `description`
- `color`
- `model`
- `background`
- `memory`
- `isolation`
- `effort`
- `permissionMode`
- `maxTurns`
- `tools`
- `disallowedTools`
- `skills`
- `initialPrompt`
- `mcpServers`
- `hooks`

Do not cross-apply skill-only fields to agents:

- `allowed-tools`
- `argument-hint`
- `arguments`
- `when_to_use`
- `version`
- `disable-model-invocation`
- `user-invocable`
- `context`
- `agent`
- `shell`
- `paths`

Source:
- `claude-code-source/src/tools/AgentTool/loadAgentsDir.ts:541-711`

## 3. Tool allow and deny lists are enforced at runtime

- `claude-code-source/src/tools/AgentTool/agentToolUtils.ts:122-224`
  - Claude resolves, filters, and validates agent tools from `tools` and `disallowedTools`.

Implication:
- Tool lists should be role-specific.
- Reviewer agents should not automatically inherit builder-style tool breadth.

## 4. Agent skill preloads are expensive if the skills are large

- `claude-code-source/src/tools/AgentTool/runAgent.ts:577-645`
  - Skills listed in agent frontmatter are loaded and injected into the initial messages.

Implication:
- Do not preload giant skills.
- Slim the skill first, then preload only high-signal, stable helpers.

## 5. Claude itself is prompt-budget conscious about agent metadata

- `claude-code-source/src/tools/AgentTool/prompt.ts:48-64`
  - Claude moved the dynamic agent list out of the main tool description because it cost about 10.2% of cache-creation tokens.

Implication:
- Thin agent prompts are not stylistic preference. They are aligned with how Claude's runtime protects prompt budget.

## 6. Project-wide rules already have a separate instruction hierarchy

- `claude-code-source/src/utils/claudemd.ts:1-16`
  - Claude loads managed, user, project, and local instruction files in a defined hierarchy.

- `claude-code-source/src/context.ts:155-186`
  - That `claudeMd` context is prepended to each conversation.

Implication:
- Do not duplicate repo-wide rules in every agent unless the repetition is truly role-specific.
- Agent bodies should not carry global policy that already belongs in project memory.

## 7. Identity vs procedure in agent bodies

Not all body content is "procedure." Before extracting, classify each section:

**Identity** (stays in body):
- Role definition and expertise claims
- Domain-specific decision heuristics (how to choose between approaches)
- Failure boundaries and scope constraints
- Traits that shape the agent's communication style
- Output contract

**Procedure** (move to skills or references):
- Step-by-step workflows with shell commands
- Large code examples and templates
- Framework-specific variants
- Checklists and scorecards
- Verbose how-to guides

Stripping expertise bullets and decision heuristics makes the agent generic — it loses the domain knowledge that justifies its existence as a specialized agent.

## Rewrite Rules Derived From These Anchors

1. Keep the agent body small because it is the live system prompt.
2. Move workflow and procedure out of agents and into skills or references.
3. Keep role expertise, decision heuristics, and domain knowledge in the body — these are identity, not procedure.
4. Use frontmatter for runtime controls instead of prose where possible.
5. Tighten `tools` and use `disallowedTools` intentionally.
6. Preload only slim, high-signal skills.
7. Remove duplicated project-wide rules from agent bodies.
8. Use only agent-native headers when rewriting an agent.
