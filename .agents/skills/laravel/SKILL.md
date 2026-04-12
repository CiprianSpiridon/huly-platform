---
name: laravel
version: 2.0.0
description: |
  Laravel API and backend reference skill: thin controllers, Form Requests, Action-driven business
  logic, API Resources, strict Eloquent usage, queues, caching, auth, observability, and the
  Laravel AI ecosystem. Use for Laravel application code, routes, models, jobs, tests, and related
  backend workflow changes.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
paths:
  - "app/**/*.php"
  - "bootstrap/**/*.php"
  - "config/**/*.php"
  - "database/**/*.php"
  - "routes/**/*.php"
  - "tests/**/*.php"
  - "resources/views/**/*.blade.php"
  - "artisan"
  - "composer.json"
argument-hint: "[Laravel task or subsystem]"
arguments:
  - request
when_to_use: |
  Use when the task touches Laravel application code, routes, controllers, models, actions,
  requests, resources, jobs, notifications, tests, or Laravel AI/MCP integrations. Examples:
  "add a Laravel API endpoint", "fix this model validation", "create a queued job", "wire up a
  Laravel MCP server". Do not use for Filament-specific admin work when the Filament skill is the
  better match.
effort: high
---

<EXTREMELY-IMPORTANT>
This skill is a routing shell over the reference set, not a place to retype the whole Laravel playbook.

Non-negotiable rules:
1. Load `references/stack.md` first, then only the task-relevant references.
2. **No business logic in controllers.** Controllers validate (Form Request), delegate (Action), return (API Resource). Nothing else.
3. **No returning Eloquent models directly.** Every response goes through an API Resource.
4. **No inline validation.** All validation lives in Form Request classes.
5. **No `$guarded = []`.** Every model uses explicit `$fillable`.
6. **No raw queries.** Use Eloquent or query builder with parameter bindings.
7. **No bare `queue:work`.** All queue processing uses Horizon.
8. **`Model::shouldBeStrict()`** must be enabled in `AppServiceProvider::boot()`.
</EXTREMELY-IMPORTANT>

# laravel

## Inputs

- `$request`: The Laravel task, bug, feature, or subsystem being worked on

## Goal

Route Laravel work through the correct project conventions so the implementation follows the existing backend architecture instead of generic framework defaults.

## Step 0: Read the stack contract

Always start with:

- `references/stack.md`

That establishes the locked runtime, package, and architecture choices for this Laravel surface.

**Success criteria**: The project's Laravel stack choices are explicit before implementation starts.

## Step 1: Load only the relevant references

Use the routing table to pick reference files that match the actual task. Do not bulk-load the full reference tree.

| Task | Read |
|------|------|
| Starting a session / understanding the stack | `references/stack.md` |
| Creating or modifying files, folder conventions | `references/folder-structure.md` |
| API routes, versioning, middleware | `references/routing.md` |
| Creating or editing a controller | `references/controller-pattern.md` |
| Adding validation to a request | `references/form-requests.md` |
| Creating or editing a model, relationships, scopes | `references/eloquent-models.md` |
| API response transformation, pagination, filtering | `references/api-resources.md` |
| Business logic, Actions, DTOs, service providers | `references/service-layer.md` |
| Authentication, tokens, roles, policies | `references/auth.md` |
| Migrations, seeders, factories, query optimization | `references/database.md` |
| Error responses, exception handling | `references/error-handling.md` |
| Logging configuration, structured logging | `references/logging.md` |
| Redis caching, cache invalidation, TTL strategy | `references/caching.md` |
| Jobs, queues, events, Horizon, broadcasting | `references/queues-jobs.md` |
| Writing tests (feature or unit) | `references/testing.md` |
| Security hardening, CORS, rate limiting, webhooks | `references/security.md` |
| API documentation generation | `references/api-docs.md` |
| Telescope, Horizon dashboard, Pulse, health checks | `references/observability.md` |
| Filament admin panel, resources, pages, widgets | `references/filament.md` |
| Docker setup, CI/CD, deployment | `references/docker.md` |
| Notifications, email, SMS | `references/notifications-mail.md` |
| File uploads, S3, media library | `references/file-storage.md` |
| Task scheduling, cron jobs | `references/scheduling.md` |
| AI agents, text/image/audio generation, embeddings, RAG | `references/ai-sdk.md` |
| AI-assisted development, Boost setup, guidelines, skills | `references/boost.md` |
| MCP servers, exposing app to AI clients, tools/resources/prompts | `references/mcp.md` |

Multiple tasks? Read multiple files. The references are self-contained.

**Success criteria**: Only the task-relevant Laravel conventions are in play.

## Step 2: Implement with the core Laravel guardrails

Keep these rules active:

- controllers validate, delegate, and return
- responses go through API Resources
- list endpoints paginate
- models use explicit `$fillable`
- mutations use the correct Action or transaction pattern
- queues use the project's queue and Horizon conventions

**Success criteria**: The change matches the project’s Laravel architecture instead of framework-default shortcuts.

## Step 3: Verify with the narrowest relevant checks

Use the smallest verification loop that matches the task:

- PHPUnit or Pest tests
- focused artisan or framework checks
- static analysis or linting if already part of the repo workflow

**Success criteria**: The change is validated in the way this Laravel project expects.

## Guardrails

- Do not inline the whole Laravel handbook in `SKILL.md`.
- Do not skip `references/stack.md`.
- Do not return raw Eloquent models directly.
- Do not put business logic in controllers.
- Do not add `disable-model-invocation`; this is a normal domain skill.

## When To Load References

- `references/stack.md`
  Always.

- then only the task-relevant files under `references/`

## Output Contract

Report:

1. which Laravel references were loaded
2. the architecture pattern chosen
3. the change made
4. the verification run
