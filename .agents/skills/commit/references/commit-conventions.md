# Commit Conventions

Use this reference when `commit/SKILL.md` needs the detailed heuristics without loading them into the main invocation path.

## Commit Type Heuristics

| Type | Signal |
| --- | --- |
| `feat` | New capability, new endpoint, new command, new UI surface |
| `fix` | Bug fix, incorrect behavior corrected, missing guard or validation |
| `docs` | Documentation-only changes |
| `style` | Formatting-only changes |
| `refactor` | Structural improvement without behavior change |
| `perf` | Measurable performance improvement |
| `test` | Test-only additions or changes |
| `build` | Tooling, package metadata, CI, bundling, Docker, compiler config |
| `chore` | Maintenance or non-user-facing repository upkeep |

## Scope Detection Order

Use this order:

1. branch naming
2. dominant changed path
3. recent commit vocabulary on the branch
4. no scope if the change spans unrelated surfaces

Examples:

- `feat/auth-system` branch → `auth`
- `src/services/search/*` only → `search`
- recent history uses `agents` consistently → keep `agents`

## When To Split Into Multiple Commits

Split when:

- unrelated features and fixes are mixed
- generated or formatting churn should be isolated
- one logical change is safe to land independently of another

Do not split when:

- the files are tightly coupled to one user-visible change
- the body of one commit would just repeat the other
- splitting would create temporary broken states

If the split is ambiguous, ask the user.

## Blocker Scan Order

1. conflict markers
2. secret-bearing files and credential patterns
3. unexpectedly large or binary files
4. debug artifacts
5. staging ambiguity

## Message Rules

- imperative mood
- no trailing period in the subject
- keep the subject tight and specific
- use a body only when the why or multi-part shape is not obvious from the subject

Format:

```text
type(scope): short description

- optional body bullet 1
- optional body bullet 2
```

## Verification Checklist

After each commit, confirm:

- the new commit exists in `git log --oneline -1`
- the message matches the intended change
- the branch state is understood
- no blocked files were staged
- remaining working-tree changes are expected

## User-Only Rationale

This skill is a strong candidate for `disable-model-invocation` because:

- it mutates git history
- it may need explicit user judgment on split boundaries
- Claude Code itself supports user-facing slash skills that are hidden from model invocation while remaining visible to the user

Relevant runtime anchors:

- `claude-code-source/src/tools/SkillTool/SkillTool.ts`
- `claude-code-source/src/commands.ts`
- `claude-code-source/src/skills/bundled/debug.ts`
- `claude-code-source/src/skills/bundled/skillify.ts`
