# Review Checklists

Use this reference when `find-bugs/SKILL.md` needs the detailed review matrix without carrying it inline on every invocation.

## Attack Surface Map

For each changed file, check whether it touches:

- user inputs
- database queries
- authentication or authorization
- session or token state
- external calls
- crypto or secret handling
- parsing or serialization
- filesystem paths or uploads
- concurrency or state transitions

## Security Review Matrix

### Injection

- SQL injection
- command injection
- template injection
- header injection
- path traversal

### XSS And Unsafe Rendering

- unsafe HTML rendering
- reflected input without escaping
- dangerous URL protocols

### Authentication And Authorization

- missing auth checks
- missing ownership checks
- IDOR patterns
- inconsistent protection between UI and API

### Session And CSRF

- missing CSRF protection on state changes
- weak session cookie settings
- token lifecycle mistakes

### Race Conditions

- TOCTOU
- double-submit paths
- unsynchronized shared state
- missing idempotency or locking

### Crypto And Secrets

- hardcoded secrets
- insecure randomness
- weak algorithms
- secret leakage through logs or errors

### Information Disclosure

- stack traces or internal errors exposed
- debug paths left enabled
- sensitive values in logs or responses

### Denial Of Service

- unbounded operations
- missing limits
- catastrophic regex patterns
- resource exhaustion paths

### Business Logic

- invalid state transitions
- edge-case handling
- incorrect assumptions about uniqueness, order, or numeric safety

## Logic Bug Checklist

Check for:

- off-by-one errors
- null or undefined access
- missing `await`
- swallowed errors
- stale closures
- resource leaks
- type coercion mistakes
- copy-paste inconsistencies
- missing return paths
- boundary-condition failures

## Verification Checklist

Before reporting a finding, verify:

1. surrounding context was read
2. framework guarantees do not already cover it
3. tests do not already prove the behavior is safe
4. the attack or failure path is real
5. the issue is in changed scope or directly required surrounding context

## Severity Guide

| Severity | Use When |
| --- | --- |
| `Critical` | Exploitable now with major unauthorized access, data loss, or system compromise |
| `High` | Significant vulnerability or correctness failure with meaningful impact |
| `Medium` | Real but narrower risk, limited blast radius, or specific exploit conditions |
| `Low` | Minor but real defect or weak hardening gap |

## Reporting Format

For each finding include:

- `File:Line`
- severity
- category
- problem
- evidence
- exploit or failure path when relevant
- concrete fix direction

Also include:

- files reviewed
- checklist coverage
- areas not fully verified

## Forked Execution Rationale

`find-bugs` is a good candidate for:

- `context: fork`
- `agent: general-purpose`
- higher effort than default

Why:

- it is analysis-heavy
- it is read-mostly
- it does not need mid-process user interaction
- it benefits from separate reasoning budget and isolation from the main implementation flow

Relevant runtime anchors:

- `claude-code-source/src/tools/SkillTool/SkillTool.ts`
- `claude-code-source/src/utils/forkedAgent.ts`
- `claude-code-source/src/skills/loadSkillsDir.ts`
