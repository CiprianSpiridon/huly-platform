# @hcengineering/desktop

Electron desktop app. Wraps the Svelte web UI in a Chromium window with native OS integration.

## Architecture

Electron app with 3 entry points:
- **Main process** (`src/main/start.ts`) — app lifecycle, tray, auto-updates, IPC
- **Renderer** (`src/ui/index.ts`) — bootstraps Svelte app, registers 60+ plugins
- **Preload** (`src/ui/preload.ts`) — IPC bridge between main/renderer

## Connection Flow (reference for mobile)

```
1. preload.loadServerConfig() → fetch /config.json → ACCOUNTS_URL
2. login plugin → accountClient.login(email, password) → token
3. accountClient.selectWorkspace(url) → { endpoint, token, workspace }
4. ClientFactory creates WebSocket connection to transactor
5. All data flows through PlatformClient (findAll, tx, search)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/main/start.ts` | Electron main process (lifecycle, tray, updater) |
| `src/ui/index.ts` | Renderer entry — creates Svelte app, IPC listeners |
| `src/ui/platform.ts` | Plugin registration, i18n loaders, metadata config |
| `src/ui/preload.ts` | Context bridge for secure IPC |
| `webpack.config.js` | Build config (3 entry points) |

## Mobile Relevance

The desktop app is a **reference implementation** for mobile. It demonstrates:
- How to load server config and authenticate
- How to register plugins and configure metadata
- How to connect to the transactor
- The full plugin list that the web/desktop UI uses

The mobile app follows the same auth flow but builds native screens instead of wrapping Svelte.

## Dependencies

Imports ALL 60+ plugin packages (types + assets + Svelte resources) because it wraps the full web UI. The mobile app should NOT follow this pattern — import only type packages.
