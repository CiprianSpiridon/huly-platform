# Learning Scope And Placement

Use this reference when deciding whether a session learning belongs in `CLAUDE.md` and where it
should be placed.

## Routing Decision

Use `update-claude-learnings` when the learning is about:

- Claude Code workflow behavior in this project
- session-management behavior for the main Claude conversation
- scope-control behavior for the main Claude conversation
- project-specific Claude habits that should persist across future sessions

Do not use it when the learning is about:

- application or implementation rules for coding agents
- subagent behavior that belongs in agent files
- skill-authoring or skill-structure guidance

Redirect examples:

- implementation/testing rule -> `update-agent-learnings`
- skill-structure or skill-quality rule -> `update-skill-learnings`

## Category Placement

Use these section targets:

| Learning type | Preferred section |
| --- | --- |
| Skill usage, command patterns, tool preferences | `## Workflow Rules` |
| Checkpoints, timeout handling, progress updates | `## Workflow Rules > ### Session Management` |
| Scope boundaries, asking before expansion, stopping conditions | `## Workflow Rules > ### Scope Control` |
| Project-specific Claude behavior that does not fit the structured workflow buckets | `## Behavioral Patterns` |

Prefer the most specific existing subsection instead of creating unnecessary new structure.

## Learning Quality Rules

A good learning is:

- actionable
- specific
- written in imperative mood
- durable across future sessions
- small enough to avoid clutter

A bad learning is:

- vague
- duplicative
- one-off
- really an application rule in disguise

Examples:

- good: `Use /commit instead of manual git commit flows when the user explicitly asks to commit.`
- good: `Ask before expanding a focused bugfix into adjacent refactors.`
- bad: `Be more careful with commits.`
- bad: `Remember the codebase better.`

## Duplicate Handling

Before adding a learning:

- search for exact matches
- search for near-duplicates with different wording
- if a broader existing rule already covers it, skip or refine the old rule instead of adding another bullet
- if the new rule is simply a narrower version of an existing one, merge carefully rather than duplicating

## Common Failure Modes

### Wrong audience

Symptom:
- the learning is really for coding agents or skill authors

Fix:
- redirect to the appropriate learning workflow

### Vague wording

Symptom:
- the rule cannot be followed mechanically in a future session

Fix:
- rewrite it as a concrete imperative instruction

### Duplicate memory clutter

Symptom:
- multiple bullets say the same thing with slightly different phrasing

Fix:
- merge or skip instead of appending

### Over-editing

Symptom:
- the update rewrites large sections of `CLAUDE.md` just to add one rule

Fix:
- make the smallest local insertion that preserves structure

## Minimal Approval Prompt

Before writing, present:

- category
- final wording
- intended section
- one-sentence rationale

Only proceed after the user explicitly approves it.
