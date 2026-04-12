# Simplification Patterns

Use this reference when `code-simplify/SKILL.md` needs the detailed pattern catalog, anti-patterns, and escalation rules without carrying them inline on every invocation.

## Good Simplification Targets

Prefer:

- flattening nested conditionals with guard clauses
- extracting dense boolean expressions into named locals
- replacing nested ternaries with clearer branching
- consolidating duplicated validation or normalization logic
- removing unused imports, branches, and locals
- renaming misleading local symbols
- reducing callback pyramids when the runtime model remains unchanged
- converting long parameter lists into a clearer options object only when call sites remain readable

## Pattern Examples

### Flatten Nesting

Before:

```ts
if (user) {
  if (user.active) {
    if (user.canEdit) {
      return save(user)
    }
  }
}
return null
```

After:

```ts
if (!user) return null
if (!user.active) return null
if (!user.canEdit) return null
return save(user)
```

### Extract Complex Conditions

Before:

```ts
if (items.length > 0 && items.every((item) => item.ready) && !isProcessing) {
  run(items)
}
```

After:

```ts
const hasReadyItems = items.length > 0 && items.every((item) => item.ready)
const canRun = !isProcessing

if (hasReadyItems && canRun) {
  run(items)
}
```

### Consolidate Obvious Duplication

Before:

```ts
function createUser(data) {
  validateName(data.name)
  validateEmail(data.email)
  return db.insert(data)
}

function updateUser(id, data) {
  validateName(data.name)
  validateEmail(data.email)
  return db.update(id, data)
}
```

After:

```ts
function validateUserData(data) {
  validateName(data.name)
  validateEmail(data.email)
}

function createUser(data) {
  validateUserData(data)
  return db.insert(data)
}

function updateUser(id, data) {
  validateUserData(data)
  return db.update(id, data)
}
```

### Replace Nested Ternaries

Before:

```ts
const label = status === 'active' ? 'Active' : status === 'pending' ? 'Pending' : status === 'disabled' ? 'Disabled' : 'Unknown'
```

After:

```ts
function getStatusLabel(status: string) {
  switch (status) {
    case 'active': return 'Active'
    case 'pending': return 'Pending'
    case 'disabled': return 'Disabled'
    default: return 'Unknown'
  }
}
const label = getStatusLabel(status)
```

### Eliminate Dead Code

Before:

```ts
import { format, parse, isValid, addDays } from 'date-fns' // parse, addDays unused

function processDate(input: string) {
  // Old implementation (kept for reference)
  // const parsed = parse(input, 'yyyy-MM-dd', new Date())
  if (isValid(new Date(input))) {
    return format(new Date(input), 'MMM d, yyyy')
  }
  return 'Invalid date'
}
```

After:

```ts
import { format, isValid } from 'date-fns'

function processDate(input: string) {
  if (isValid(new Date(input))) {
    return format(new Date(input), 'MMM d, yyyy')
  }
  return 'Invalid date'
}
```

### Simplify Boolean Expressions

Before:

```ts
if (isEnabled === true) { ... }
if (items.length === 0 ? true : false) { ... }
return condition ? true : false
```

After:

```ts
if (isEnabled) { ... }
if (items.length === 0) { ... }
return condition
```

### Reduce Function Parameters

Before:

```ts
function sendEmail(to, from, subject, body, cc, bcc, replyTo, isHtml) { ... }
sendEmail('a@b.com', 'c@d.com', 'Hello', '<p>Hi</p>', null, null, null, true)
```

After:

```ts
function sendEmail({ to, from, subject, body, cc, bcc, replyTo, isHtml = false }) { ... }
sendEmail({ to: 'a@b.com', from: 'c@d.com', subject: 'Hello', body: '<p>Hi</p>', isHtml: true })
```

### Flatten Callback Pyramids

Before:

```ts
getUser(id, function(err, user) {
  if (err) return handleError(err)
  getOrders(user.id, function(err, orders) {
    if (err) return handleError(err)
    getInvoices(orders, function(err, invoices) {
      if (err) return handleError(err)
      sendReport(user, invoices)
    })
  })
})
```

After:

```ts
try {
  const user = await getUser(id)
  const orders = await getOrders(user.id)
  const invoices = await getInvoices(orders)
  await sendReport(user, invoices)
} catch (err) {
  handleError(err)
}
```

## Risk Guide

Low risk:

- dead code removal confirmed by references
- boolean cleanup
- local extraction with unchanged call surface
- local renames

Medium risk:

- shared helper extraction across multiple callers
- public symbol renames
- parameter reshaping
- async-flow flattening

High risk:

- anything that changes evaluation order
- any cleanup that touches persistence, caching, retries, transactions, auth, or concurrency
- "simplifications" that remove edge-case handling

Ask the user when the work becomes medium/high risk or when multiple reasonable cleanup directions exist.

## Anti-Patterns

Do not:

- shorten code at the expense of readability
- replace explicit logic with clever one-liners
- remove comments that still explain retained behavior
- weaken tests to make the cleanup pass
- convert a cleanup request into an architectural rewrite
- assume `CLAUDE.md` must be reread manually on every invocation

## Verification Heuristics

Prefer the narrowest meaningful verification:

- symbol- or file-specific tests first
- local type check or compile step next
- broader suite only when the touched code is central or highly coupled

If no verification exists, say so explicitly and keep the edit set smaller.
