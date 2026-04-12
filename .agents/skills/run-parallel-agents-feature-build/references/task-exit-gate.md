# Task Exit Gate

Mandatory closeout checklist before any task is marked complete. Read this file before closing a task — do not work from memory.

## Closeout Checklist

For every task, complete ALL of these before marking done:

### 1. Acceptance Criteria Audit

Read the task's acceptance criteria from the plan. Check each one:

```
- criterion 1: DONE / NOT DONE
- criterion 2: DONE / NOT DONE
- ...
```

Every "NOT DONE" must be resolved or explicitly deferred with justification.

### 2. Write-Scope Audit

Read the task's write scope from the plan. Confirm every listed file:

```
- file A: TOUCHED / INTENTIONALLY UNCHANGED (reason)
- file B: TOUCHED / INTENTIONALLY UNCHANGED (reason)
```

An untouched write-scope file must be justified, not assumed okay.

### 3. Invariant Audit

For tasks involving identity, routing, registry, startup rebuild, cleanup, or multi-table/multi-schema isolation — trace the invariant end-to-end:

| Path | Identity Preserved? |
|------|-------------------|
| Startup iteration | schema + table |
| Live CREATE | schema + table |
| Live DROP | schema + table |
| Restart rebuild | schema + table |
| Planner lookup | schema + table |
| UDTF lookup | schema + table |
| WAL consumer routing | table_id |
| Disk paths | table_id |
| Error paths | correct cleanup |

If any path throws away identity (hardcodes "public", strips schema, uses bare table_name), that is a bug. Fix it before closing.

### 4. Regression Tests

List exact tests that prove the core invariant:

```
- test name: what it proves
- test name: what it proves
```

Every nontrivial task needs at least one anti-drift regression test — not just happy-path compile/test coverage. For isolation tasks, the brutal test is:

1. Create `public.docs` and `analytics.docs`
2. Index both
3. Verify both queryable separately
4. Restart
5. Verify both still queryable separately
6. Drop one
7. Verify the other still works

### 5. Validation Command

Run the plan's validation command — not just `cargo check`:

```
- plan says: <command>
- result: PASS / FAIL
```

## When This Is a Cross-Path Invariant Task

Any task involving these concepts must trace all paths in the Invariant Audit:

- identity / namespace
- routing / dispatch
- registry / lookup
- startup rebuild
- cleanup / teardown
- multi-schema / multi-tenant / multi-table isolation

These are NOT local refactors. They are cross-cutting. Fixing one end (e.g., lookup normalization) without fixing the other end (e.g., data flow hardcoding "public") leaves the system broken.

**Rule:** Start from the source (catalog/DDL) and trace the value through every function boundary to the consumer. Don't fix one end and assume the other is correct.

## Plan Invariant Contracts

Plans should enforce invariants, not just file edits. For isolation/identity tasks, the plan should declare:

| Boundary | Key Format |
|----------|-----------|
| Runtime lookup key | `schema.table` (lowercase) |
| Disk identity | `table_id` (numeric) |
| Startup rebuild identity | iterate all schemas, resolve `schema.table` |
| DDL create/drop identity | `schema.table` through every function boundary |
| Test identity | `schema_a.docs` and `schema_b.docs` must not collide |

If the plan doesn't declare these, ask before starting.
