# Learning Scope And Placement

Use this reference when deciding whether a session learning belongs in the central skill learnings
file and where it should be placed.

## Routing Decision

Use `update-skill-learnings` when the learning is about:

- skill structure
- skill writing style or clarity
- reusable anti-patterns in skill content
- a skill-specific design rule worth preserving centrally

Do not use it when the learning is about:

- application or implementation patterns
- agent behavior for the main Claude conversation
- direct code changes to an existing skill

Redirect examples:

- application/testing rule -> `update-agent-learnings`
- Claude workflow or project memory rule -> `update-claude-learnings`
- rewrite a skill right now -> the relevant rewrite skill or direct edit workflow

## Category Placement

Use these section targets:

| Learning type | Preferred section |
| --- | --- |
| Reusable layout, metadata, or structural rules | `## Structural Patterns` |
| Instruction-writing, clarity, examples, interaction rules | `## Content Patterns` |
| Things skills should avoid doing | `## Anti-Patterns` |
| One named skill's specific durable rule | `## Skill-Specific Learnings > <skill-name>` |

Prefer the most specific existing subsection instead of creating unnecessary new structure.

## Canonical File Policy

There should be one source of truth.

Path selection rules:

- if one central skill learnings file already exists, update it
- if both `.agents` and `.claude` versions exist, prefer the canonical authoring tree and do not write to both
- in this `.agents`-first repo, prefer `.agents/learnings/skill-learnings.md`
- only use `.claude/learnings/skill-learnings.md` when it is the sole existing learnings store

Do not create a second parallel learnings file just because both paths are plausible.

## Learning Quality Rules

A good learning is:

- actionable
- specific
- written in imperative mood
- durable across future skill work
- small enough to avoid clutter

A bad learning is:

- vague
- duplicative
- one-off
- really an implementation or agent rule in disguise

Examples:

- good: `Keep heavy reference material out of the main SKILL.md invocation path.`
- good: `Use disable-model-invocation for durable-memory maintenance skills.`
- bad: `Make skills better.`
- bad: `Try to be more clear.`

## Duplicate Handling

Before adding a learning:

- search for exact matches
- search for near-duplicates with slightly different wording
- if a broader existing rule already covers it, skip or refine the old rule instead of adding another bullet
- if the new rule is just a narrower version of an existing one, merge carefully rather than duplicating

## Common Failure Modes

### Wrong audience

Symptom:
- the learning is really for coding agents or the main Claude workflow

Fix:
- redirect to the proper learnings workflow

### Vague wording

Symptom:
- the rule cannot be followed mechanically in a future skill rewrite

Fix:
- rewrite it as a concrete imperative instruction

### Duplicate clutter

Symptom:
- the same rule appears twice with different wording

Fix:
- merge or skip instead of appending

### Wrong storage target

Symptom:
- a second central learnings file gets created in another tree

Fix:
- choose one canonical file and use it consistently

## Minimal Approval Prompt

Before writing, present:

- category
- final wording
- target learnings file
- one-sentence rationale

Only proceed after the user explicitly approves it.
