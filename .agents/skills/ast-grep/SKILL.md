---
name: ast-grep
version: 2.0.0
description: |
  Structural code search via AST patterns. Use when grep/ripgrep cannot express the pattern
  reliably and you need to match code by syntax shape instead of text. Requires the `ast-grep`
  CLI.
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Write
  - Glob
  - Grep
argument-hint: "[pattern description and language]"
arguments:
  - request
when_to_use: |
  Use when the user asks to find code by structure rather than by exact text. Examples: "find all
  async functions without try/catch", "find React hooks called conditionally", or "search for
  this AST pattern". Do not use for plain literal/regex search when Grep is enough.
effort: high
---

<EXTREMELY-IMPORTANT>
This skill turns natural-language structure queries into tested ast-grep searches.

Non-negotiable rules:
1. Verify `ast-grep` is installed before relying on it.
2. Create a minimal example of the desired pattern before searching the repository.
3. Inspect the AST with `--debug-query` when node kinds or match shape are uncertain.
4. Add `stopBy: end` to relational rules unless there is a specific reason not to.
5. Test the rule on the example before running it across the codebase.
</EXTREMELY-IMPORTANT>

# ast-grep Code Search

## Inputs

- `$request`: The structural pattern to find, plus any known language, exclusions, or edge cases

## Goal

Produce a reliable structural search by:

- confirming ast-grep is available
- clarifying the intended pattern and language
- building the smallest rule that can work
- testing it on example code first
- validating repository results before reporting them

## Step 0: Verify availability and resolve the query

First verify `ast-grep` is installed with `ast-grep --version`.

If it is not installed:

- stop
- tell the user `ast-grep` is required for this workflow
- provide installation guidance instead of pretending the search can proceed

Then resolve:

- the programming language
- what should match
- what should not match
- any edge cases the user cares about

Use `AskUserQuestion` only if those details are ambiguous enough to risk a bad rule.

**Success criteria**: `ast-grep` availability, language, and pattern intent are explicit.

## Step 1: Create a minimal example and inspect the AST

Write a tiny example snippet that should match.

Use `--debug-query=cst` or `--debug-query=pattern` when needed to understand:

- the real node kinds
- how metavariables are parsed
- where the target structure sits in the tree

Rules:

- keep the example as small as possible
- debug the AST when kind names or nesting are uncertain
- do not skip this step just because the pattern "looks obvious"

Load `references/rule_reference.md` for syntax details and `references/search-recipes.md` for common command shapes.

**Success criteria**: The target shape is represented by a tested example and the AST structure is understood well enough to write the rule.

## Step 2: Write the smallest rule that can work

Start from the simplest viable rule:

- `pattern` first for direct structural matches
- `kind` plus relational rules for more complex structures
- `all`, `any`, or `not` only when needed

Rules:

- add `stopBy: end` to `inside` and `has` unless a tighter stop condition is intentional
- keep the rule minimal until it proves insufficient
- escape metavariables correctly when using inline shell commands

Load `references/rule_reference.md` for rule semantics.

**Success criteria**: The rule is syntactically valid and appropriately simple for the problem.

## Step 3: Test the rule on the example

Test the rule against the example snippet using `--stdin` or a temporary file.

Check:

- it matches the intended example
- it does not obviously overmatch
- relational rules traverse the intended scope

If the rule fails:

- simplify it
- re-check the AST
- adjust kind names or rule shape
- retest before touching the repository

**Success criteria**: The rule matches the known example correctly.

## Step 4: Search the codebase and validate results

Once the rule works on the example, run it against the repository.

Then validate:

- total match count
- representative file paths and lines
- 3 to 5 spot-checks to confirm the intent
- edge cases the user explicitly mentioned

Rules:

- if Grep would have been enough after all, say so, but complete the current ast-grep search if already in motion
- if the rule becomes too complex or brittle, narrow the query rather than returning unverified noise

Load `references/search-recipes.md` for common search and debug flows.

**Success criteria**: The repository results are credible, reproducible, and not obviously noisy.

## Step 5: Report the results and reusable rule

Report:

- pattern description
- language
- rule type used
- match count
- representative file:line matches
- the final reusable rule or command shape

If no matches were found, say so explicitly and explain whether that likely means:

- the pattern does not exist
- the rule was intentionally narrow
- more clarification is needed

**Success criteria**: The user can rerun the search or refine it from your output.

## Guardrails

- Do not add `disable-model-invocation`; this is a non-destructive search skill.
- Do not add `context: fork`; the user usually wants the result in the current flow.
- Do not add `paths:`; this is a generic search workflow.
- Do not search the repository with an untested rule when the query is non-trivial.
- Do not keep giant CLI manuals, recipe catalogs, or failure encyclopedias inline in `SKILL.md`.
- Do not use ast-grep when plain Grep is clearly sufficient.

## When To Load References

- `references/rule_reference.md`
  Use for ast-grep rule syntax, relational rules, composite rules, and metavariable semantics.

- `references/search-recipes.md`
  Use for installation guidance, command patterns, common use cases, and debugging flows.

## Output Contract

Report:

1. the structural pattern searched for
2. the language and rule type used
3. the match count and representative file:line results
4. the final rule or reusable command shape
5. any important caveats or follow-up refinements
