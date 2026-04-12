# ast-grep Search Recipes

Use this reference when you need command examples, troubleshooting patterns, or common structural
search shapes.

## Installation Check

Verify availability first:

```bash
ast-grep --version
```

If unavailable, provide installation guidance such as:

- `brew install ast-grep`
- `cargo install ast-grep`
- `npm install -g @ast-grep/cli`

## Useful Commands

### Inspect AST structure

```bash
ast-grep run --pattern 'async function example() { await fetch(); }' \
  --lang javascript \
  --debug-query=cst
```

Use:

- `--debug-query=cst` to inspect concrete syntax structure
- `--debug-query=pattern` to inspect how ast-grep parses your pattern

### Test a rule with stdin

```bash
echo "const x = await fetch()" | ast-grep scan --inline-rules "id: test
language: javascript
rule:
  pattern: await \$EXPR" --stdin
```

### Run a simple pattern search

```bash
ast-grep run --pattern 'console.log($ARG)' --lang javascript .
```

### Run a YAML rule search

```bash
ast-grep scan --rule my_rule.yml .
```

## Common Search Shapes

### Function containing an awaited expression

```yaml
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end
```

### Call inside a specific enclosing context

```yaml
rule:
  pattern: console.log($$$)
  inside:
    kind: method_definition
    stopBy: end
```

### Match one thing while excluding another

```yaml
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          pattern: try { $$$ } catch ($ERR) { $$$ }
          stopBy: end
```

## Debugging Checklist

If a rule does not match:

1. Verify the language is correct.
2. Inspect the AST with `--debug-query=cst`.
3. Simplify the rule.
4. Confirm metavariables are parsed the way you expect.
5. Add or fix `stopBy: end` on relational rules.
6. Retest against the minimal example before rerunning on the repository.

## Shell Escaping Reminder

When using inline rules in the shell:

- escape `$` as `\$` inside double-quoted strings
- or prefer single quotes around the outer shell string when possible

Example:

```bash
ast-grep scan --inline-rules "rule: { pattern: 'console.log(\$ARG)' }" .
```
