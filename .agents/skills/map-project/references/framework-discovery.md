# Framework Discovery

Use this reference when `map-project/SKILL.md` needs the detailed detection and discovery rules without carrying the framework matrix inline on every invocation.

## Detection Order

Check in this order:

1. Laravel: `composer.json` plus `artisan`
2. Next.js: `next.config.*` plus `app/` or `src/app/`
3. NestJS: `nest-cli.json` or `@nestjs/core`
4. Expo / React Native: `app.json` with Expo plus `app/_layout.tsx`
5. Node.js monorepo: root `package.json` plus `packages/*/package.json`

If multiple match, pick the primary app surface the user wants documented and note any secondary surfaces explicitly.

## Discovery Expectations By Project Shape

### Laravel

Inventory:

- models and relationships
- services
- jobs and dispatchers
- observers
- middleware
- API resources
- form requests
- routes
- console commands
- enums, traits, contracts, mailables

### Next.js

Inventory:

- page routes
- API routes
- layouts
- server actions
- client components
- middleware
- hooks
- shared types

### NestJS

Inventory:

- modules
- controllers and routes
- services
- entities
- DTOs
- guards
- pipes
- interceptors
- filters
- decorators

### Expo / React Native

Inventory:

- routes and screens
- layouts
- components
- hooks
- stores
- API hooks
- services
- types
- platform-specific files

### Node.js Monorepo

Inventory:

- packages
- package entry points
- exports
- subpath exports
- route handlers
- stateful entities

## Discovery Rules

- verify from code, not from memory
- collect counts where possible
- preserve examples of real implementation patterns for later documentation
- search for state machines and integration boundaries, not just file names
- if the repo is partially documented already, verify and extend rather than discarding by default
