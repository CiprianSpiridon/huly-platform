# Learning Scope And Routing

Use this reference when deciding whether a session learning belongs in agent memory and how widely
it should propagate.

## Routing Decision

Use `update-agent-learnings` when the learning is about:

- coding-agent scope control
- coding-agent session management
- testing or validation habits for coding agents
- multi-agent coordination behavior for agent workers
- one named agent's durable rule
- a "Claude Code Only" meta-learning that belongs in the central agent learnings store

Do not use it when the learning is about:

- skill structure or skill quality
- project `CLAUDE.md` behavior rules
- direct prompt rewrites to a specific agent

Redirect examples:

- skill-design rule -> `update-skill-learnings`
- main Claude workflow rule -> `update-claude-learnings`
- prompt rewrite request -> direct agent edit or `normalize-agent-for-claude`

## Scope Classification

Use these scope labels:

| Scope | Use when | Propagate to agent prompts? |
| --- | --- | --- |
| `Global` | The rule applies across coding/reviewer agents | Yes |
| `Claude Code Only` | The rule is about meta-work, orchestration, configs, skills, or project setup | No |
| `Agent-Specific` | The rule applies to one named agent family | Yes, only matching agent files |

Heuristic:

- if a normal coding or review agent should follow it while doing application work, it is probably `Global` or `Agent-Specific`
- if it is about creating agents, skills, orchestration, or project memory, it is probably `Claude Code Only`

## Duplicate Handling

Before adding a learning:

- search for exact matches
- search for near-duplicates with weaker or broader wording
- merge with an existing rule when that is clearer than appending a new bullet

## Common Failure Modes

### Wrong scope

Symptom:
- a meta-level Claude rule gets pushed into all agent prompts

Fix:
- classify it as `Claude Code Only` and keep it in the central learnings file only

### Over-broad global rule

Symptom:
- a technology-specific rule gets propagated to every agent

Fix:
- make it `Agent-Specific`

### Duplicate clutter

Symptom:
- similar rules appear multiple times with slightly different wording

Fix:
- merge or skip instead of appending

## Minimal Approval Prompt

Before writing, present:

- scope
- final wording
- canonical learnings file
- sync target trees

Only proceed after the user explicitly approves it.
