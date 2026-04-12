# Bug Fix Playbooks

Load this file after classifying the bug category in `bugfix/SKILL.md`.

Use the matching section to choose the fix shape and the category-specific verification checks.

## Category Map

- Injection
- XSS
- Auth/AuthZ
- Null safety
- Race condition
- Boundary / off-by-one
- Async / Promise
- Type safety
- Resource leak
- Logic / business rule

## 1. Injection

Root cause pattern:
- user-controlled input concatenated into SQL, shell commands, templates, or file paths

Fix shape:
- parameterize, constrain, or validate at the boundary
- never rely on blocklist sanitization as the main fix

Verification:
- include an exploit-like payload in the reproducer
- search for other code paths using the same unsafe pattern
- verify all affected call sites use the same safe pattern

## 2. XSS

Root cause pattern:
- user-controlled content rendered as HTML without safe escaping or sanitization

Fix shape:
- escape at render/output time
- prefer framework auto-escaping
- sanitize only when raw HTML rendering is intentionally required

Verification:
- test with script-tag payloads and dangerous URL protocols
- check all render points for the same data
- verify raw HTML escape hatches are not still reachable

## 3. Auth/AuthZ

Root cause pattern:
- missing auth checks, missing ownership checks, or resource access scoped too broadly

Fix shape:
- deny by default
- add explicit auth and authorization checks
- prefer query scoping to post-fetch ownership checks

Verification:
- unauthenticated access is rejected
- unauthorized access is rejected
- related endpoints for the same resource are checked too

## 4. Null Safety

Root cause pattern:
- a value can be null or undefined in production, but code assumes it always exists

Fix shape:
- prefer fixing the source of the bad assumption
- if null is legitimate, handle it at the business-logic boundary
- align runtime handling and types

Verification:
- test the null or missing-data path explicitly
- confirm the type shape matches runtime reality
- avoid silent fallback that hides the real bug unless that fallback is the intended product behavior

## 5. Race Condition

Root cause pattern:
- check-then-act windows, double submission, unsynchronized shared state, stale reads

Fix shape:
- make the critical section atomic
- use transactions, locking, version checks, or idempotency where appropriate

Verification:
- simulate concurrent or repeated execution where possible
- reason through two interleaving requests
- ensure the fix is retry-safe and does not introduce deadlock

## 6. Boundary / Off-by-One

Root cause pattern:
- incorrect inclusive/exclusive bounds, pagination math, slice ends, loop limits

Fix shape:
- make the boundary math explicit
- test the first, last, empty, and just-outside cases

Verification:
- cover `0`, `1`, max, and max plus one where relevant
- test empty and single-item inputs
- confirm inclusive vs exclusive rules are consistent across the code path

## 7. Async / Promise

Root cause pattern:
- missing `await`, swallowed rejections, stale closures, async loops that do not actually wait

Fix shape:
- await all required async work
- replace unsafe loop patterns like `forEach(async ...)`
- make error handling explicit

Verification:
- confirm the operation actually completes before assertions run
- check for uncaught rejections
- for UI code, verify cleanup and dependency behavior

## 8. Type Safety

Root cause pattern:
- compile-time type assumptions do not match runtime values

Fix shape:
- validate external data at the boundary
- reduce unsafe casts
- tighten comparisons and discriminants

Verification:
- test invalid or malformed input
- inspect remaining casts nearby
- ensure runtime validation and static types now agree

## 9. Resource Leak

Root cause pattern:
- cleanup only happens on the happy path, or event/timer/subscription lifecycles are incomplete

Fix shape:
- guarantee cleanup on success, failure, and early return
- pair setup and teardown in the same reasoning unit

Verification:
- assert cleanup runs
- inspect error paths and early returns
- check related listeners, timers, handles, and connections

## 10. Logic / Business Rule

Root cause pattern:
- wrong condition, wrong state transition, missing rule, or behavior diverges from the product rule

Fix shape:
- restate the correct behavior first
- change only the branch or rule that diverges
- avoid rewriting the full function unless the bug actually requires it

Verification:
- test the buggy scenario and the adjacent valid scenarios
- confirm all important branches are exercised
- if a state machine is involved, validate allowed and disallowed transitions

## Cross-Cutting Verification Questions

Ask these after every category-specific fix:

1. Does the reproducer prove the original bug is now fixed?
2. Would the reproducer fail again if the fix were reverted?
3. Did the change alter non-buggy behavior unnecessarily?
4. Did the change widen scope into refactor or feature work?
5. Are there other nearby instances of the same pattern that must also be fixed or explicitly deferred?

## What Not To Do

- Do not treat `/find-bugs` suggestions as executable truth.
- Do not stop at the first null check, escape call, or try/catch if the root cause is earlier.
- Do not add heavy defense-in-depth work if it turns a bugfix into a redesign.
- Do not weaken tests just to get green.
