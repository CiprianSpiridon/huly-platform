# Huly Platform

All-in-one project management platform. Rush monorepo, 481 packages, TypeScript + Svelte + Go + Rust.

## Branch Model

- `develop` — submit PRs here
- `staging` — pre-release
- `main` — production

## Build

```bash
rush install && rush build          # full build
rush build -t @hcengineering/mobile # single target
rush docker:up                      # local docker stack
```

## Architecture

| Layer | Location | Purpose |
|-------|----------|---------|
| Foundation packages | `foundations/core/packages/` | Core types, clients, platform |
| Plugin types | `plugins/<name>/` | Domain type definitions |
| Plugin assets | `plugins/<name>-assets/` | i18n translations |
| Plugin resources | `plugins/<name>-resources/` | Svelte UI components |
| Server plugins | `server-plugins/` | Server-side logic |
| Services | `services/` | Backend microservices |
| Desktop app | `desktop/` | Electron wrapper |
| Mobile app | `mobile/` | Expo/React Native (in progress) |
| Design tokens | `packages/mobile-design-tokens/` | Shared design system (in progress) |

## Key Backend Services

| Service | Port | Purpose |
|---------|------|---------|
| Account | 3000 | Auth, login, workspace management |
| Transactor | 3332 | Data mutations via WebSocket |
| Collaborator | 3078 | Real-time doc sync (Y.js) |
| Datalake | 4030 | File upload/download |
| Fulltext | 4702 | Elasticsearch search |
| HulyPulse | 8099 | Push notifications |

## RN-Safety Matrix (for mobile app work)

| Package | RN Safe? | Issue |
|---------|----------|-------|
| `@hcengineering/core` | Yes | Pure TS |
| `@hcengineering/platform` | Yes | Pure TS + intl-messageformat |
| `@hcengineering/account-client` | Yes | Pure fetch() |
| `@hcengineering/client` | Yes | Interfaces only |
| `@hcengineering/api-client` | Partial | Pulls text/tiptap, client-resources |
| `@hcengineering/client-resources` | No | IndexedDB, localStorage |
| `plugins/tracker,task,...` | Type-only | Depend on @hcengineering/ui → svelte |

## Locked Decisions (Mobile)

- Expo SDK 55, React Native 0.83.1, React 19.2.0
- NativeWind v4 + Tailwind CSS v3 (stable)
- expo-router v6 for navigation
- Zustand for client state, TanStack Query for server state
- expo-secure-store for auth tokens
- IBM Plex Sans font (matches web)
- `import type` only for plugin packages (svelte dep chain)

## Rules

- **Never leave bugs behind.** If a review finds defects, fix them before moving to the next phase. No TODOs, no "known issues" deferred to nonexistent future plans. If it's broken, fix it now.
- **Stay in the working directory.** Don't `cd` to other folders. Use absolute paths or `dev.sh` scripts.

## Known Defects (fix before next release)

1. **Hooks-of-Rules violation in AppLayout** — `useChatUnreadSync()` and `useUnreadCount()` called after conditional returns in `mobile/src/app/(app)/_layout.tsx`. Fix: split into child component or move hooks above redirects.
2. **Chat unread query too broad** — `useChatUnread.ts` queries all DocNotifyContext with `{}`. Must filter by current user, restrict to Channel/DirectMessage objectClasses, exclude hidden contexts.
3. **Chat unread counts never cleared** — stale badge counts persist when contexts disappear. Fix: rebuild from scratch on each poll instead of incremental patching.
4. **Reaction identity still inconsistent** — useMessages optimistic reactions use auth store AccountUuid, useThread stamps 'me'. All must use `useConnectionStore.currentSocialId`. (Partially fixed but verify all paths.)
5. **Tracker comments include system messages** — `activity.ts` fetches base ActivityMessage class. Fix: use `chunter:class:ChatMessage` for issue comments to exclude DocUpdateMessage/ActivityInfoMessage.

## Tools

- **codemap** — indexed with `.codemapignore`. Use `codemap search`, `codemap symbols`, `codemap deps` for codebase exploration.
- **browse** — use for iOS simulator screenshots and interaction: `browse --platform ios --app host.exp.Exponent screenshot /tmp/screenshot.png`
- **expo-react-native skill** — load before any mobile work. Contains 17 references covering routing, styling, data access, auth, testing, etc.

## Per-Member Docs

See `CLAUDE.md` in each package directory for local guidance.
