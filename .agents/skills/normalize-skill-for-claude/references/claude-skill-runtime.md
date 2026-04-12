# Claude Code Skill Runtime Anchors

Use these anchors to justify every normalization decision.

## 1. Metadata drives first-pass skill discovery

- `claude-code-source/src/skills/loadSkillsDir.ts:96-105`
  - `estimateSkillFrontmatterTokens()` counts only `name`, `description`, and `whenToUse`.
  - Implication: improve frontmatter before touching long body prose.

- `claude-code-source/src/tools/SkillTool/prompt.ts:20-29`
  - Skill listing gets about 1% of context and descriptions are capped at 250 chars.
  - Implication: short, trigger-oriented descriptions beat long marketing copy.

- `claude-code-source/src/tools/SkillTool/prompt.ts:173-195`
  - If a skill matches the request, invoking it first is a blocking requirement.
  - Implication: giant router constitutions usually duplicate runtime behavior.

## 2. Claude parses more skill frontmatter than most custom skills use

- `claude-code-source/src/skills/loadSkillsDir.ts:185-264`
  - Claude parses `allowed-tools`, `argument-hint`, `arguments`, `when_to_use`, `model`,
    `disable-model-invocation`, `user-invocable`, `hooks`, `context`, `agent`, `effort`, and `shell`.
  - Implication: normalization should decide which fields materially improve routing or safety.

- `claude-code-source/src/skills/bundled/skillify.ts:142-146`
  - Claude's own skill authoring guidance says `when_to_use` is critical and `allowed-tools` should stay minimal.
  - Implication: do not add broad tool permissions without reason.

Skill-native frontmatter:

- `name`
- `description`
- `allowed-tools`
- `argument-hint`
- `arguments`
- `when_to_use`
- `version`
- `model`
- `disable-model-invocation`
- `user-invocable`
- `hooks`
- `context`
- `agent`
- `effort`
- `shell`
- `paths`

Do not cross-apply agent-only fields to skills:

- `tools`
- `disallowedTools`
- `skills`
- `initialPrompt`
- `permissionMode`
- `maxTurns`
- `background`
- `memory`
- `isolation`
- `color`
- `mcpServers`

Source:
- `claude-code-source/src/skills/loadSkillsDir.ts:185-264`
- `claude-code-source/src/skills/loadSkillsDir.ts:155-178`

## 3. Full skill bodies are loaded only on invocation

- `claude-code-source/src/skills/loadSkillsDir.ts:344-398`
  - `getPromptForCommand()` loads the full markdown body when the skill is invoked.
  - Implication: keep `SKILL.md` focused on workflow and move bulky detail into `references/` or `scripts/`.

## 4. Path-scoped skills are real runtime behavior

- `claude-code-source/src/skills/loadSkillsDir.ts:155-178`
  - Claude parses `paths:` globs from frontmatter.

- `claude-code-source/src/skills/loadSkillsDir.ts:771-799`
  - Skills with `paths:` are stored as conditional skills.

- `claude-code-source/src/skills/loadSkillsDir.ts:997-1045`
  - Matching touched paths activate those conditional skills dynamically.

Implication:
- Use `paths:` for domain skills tied to file trees.
- Do not use `paths:` on generic workflows like `commit`, `create-pr`, or `start`.

## 5. Forked skill execution is real and should stay rare

- `claude-code-source/src/skills/loadSkillsDir.ts:260`
  - `context: fork` is parsed into execution context.

- `claude-code-source/src/tools/SkillTool/SkillTool.ts:621-632`
  - A skill with `context: fork` runs through `executeForkedSkill()`.

Implication:
- Only mark a skill `context: fork` when it is self-contained, analysis-heavy, and does not need mid-process user interaction.
- Do not add `context: fork` to normal edit workflows just because it sounds more agentic.

## 6. Internal-only skills should say so explicitly

- `claude-code-source/src/skills/loadSkillsDir.ts:216-220`
  - `user-invocable` defaults to true unless explicitly disabled.

- `claude-code-source/src/skills/loadSkillsDir.ts:329-335`
  - Hidden skills are marked from `user-invocable: false`.

Implication:
- Internal router or maintenance skills should usually be hidden.
- User-facing slash commands should remain invocable.

## 7. Content classification: bulk vs structural

Not all inline content is "bulk." Before extracting, classify each section:

**Bulk** (safe to extract to `references/`):
- Giant code examples, before/after samples
- Framework-specific variants (e.g., "React version", "Vue version")
- Edge-case catalogs, verbose checklists, quality scorecards
- Completion announcement templates, workflow summary diagrams

**Structural** (keep inline or extract with mandatory load):
- Routing tables that map task types to reference files — these ARE the skill's navigation
- Numbered guardrail rules in `EXTREMELY-IMPORTANT` blocks
- Gate classifications (BLOCK/CONCERN/OBSERVATION tables)
- Personality/expertise/traits sections that define the skill's approach
- Concrete always/never rule sets that shape execution safety

Stripping structural content without replacement causes silent regression — the skill looks cleaner but loses operational guidance that was load-bearing.

## Rewrite Rules Derived From These Anchors

1. Frontmatter first. Routing and safety metadata are higher leverage than long prose.
2. Keep `SKILL.md` to core workflow, not encyclopedia content.
3. Split large examples and framework variants into `references/`.
4. Keep routing tables, numbered guardrails, and gate classifications inline or with mandatory load directives.
5. When extracting personality/expertise, add a mandatory load directive at session start.
6. Use `paths:` only when the touched-file activation behavior is genuinely useful.
7. Use `context: fork` only when a forked execution model clearly improves the workflow.
8. Keep `allowed-tools` intentionally narrow.
9. Use only skill-native headers when rewriting a skill.
