# Metro Monorepo Configuration

## What

The Huly mobile app lives at `mobile/` inside a Rush monorepo. Metro bundler must be configured to resolve packages from the monorepo root, deduplicate React instances, and block server-only packages that contain Node.js builtins. Without correct Metro configuration, builds fail with cryptic module resolution errors or crash at runtime from duplicate React copies.

### Package safety table

| Package | Safe for mobile | Notes |
|---|---|---|
| `@hcengineering/core` | Yes | Types, utilities, no Node builtins |
| `@hcengineering/platform` | Yes | Plugin system, resource IDs |
| `@hcengineering/account-client` | Yes | Pure fetch-based account operations |
| `@hcengineering/api-client` | Partial | Client and REST modules safe; `storage/client.ts` uses Node `stream` |
| `@hcengineering/tracker` | Yes | Type definitions only (Issue, Project, etc.) |
| `@hcengineering/chunter` | Yes | Type definitions only (Channel, Message, etc.) |
| `@hcengineering/contact` | Yes | Type definitions only (Person, Employee, etc.) |
| `@hcengineering/notification` | Yes | Type definitions only |
| `@hcengineering/client` | Yes | Client plugin interface |
| `@hcengineering/client-resources` | Partial | Socket adapter, needs browser WebSocket |
| `@hcengineering/ui` | No | Svelte components, browser DOM APIs |
| `@hcengineering/presentation` | No | Svelte, browser DOM |
| `@hcengineering/server-*` | No | Node.js server packages |
| `@hcengineering/model-*` | No | Build-time model generation |
| `@hcengineering/theme` | No | Svelte theme package, browser DOM |

### Node.js builtins that break Metro

These modules do not exist in the React Native / Hermes runtime:

`fs`, `path`, `crypto`, `http`, `https`, `net`, `tls`, `stream`, `os`, `child_process`, `cluster`, `dgram`, `dns`, `readline`, `zlib`, `buffer` (Node version), `url` (Node version), `util` (Node version), `events` (Node version)

## How

### Complete metro.config.js for Huly monorepo

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Monorepo root -- two levels up from mobile/
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// -------------------------------------------------------------------
// 1. Watch folders -- tell Metro about monorepo packages
// -------------------------------------------------------------------
config.watchFolders = [
  monorepoRoot,
];

// -------------------------------------------------------------------
// 2. Node module resolution -- search local first, then monorepo root
// -------------------------------------------------------------------
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'common/temp/node_modules'),
];

// -------------------------------------------------------------------
// 3. Deduplicate React -- ensure single copy across all packages
// -------------------------------------------------------------------
config.resolver.extraNodeModules = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
};

// -------------------------------------------------------------------
// 4. Block server-only modules that contain Node builtins
// -------------------------------------------------------------------
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const blockedPrefixes = [
    '@hcengineering/server-',
    '@hcengineering/model-',
    '@hcengineering/ui',
    '@hcengineering/presentation',
    '@hcengineering/theme',
  ];

  const blockedExact = [
    'stream',
    'fs',
    'path',
    'crypto',
    'http',
    'https',
    'net',
    'tls',
    'os',
    'child_process',
  ];

  if (blockedPrefixes.some((prefix) => moduleName.startsWith(prefix))) {
    return { type: 'empty' };
  }

  if (blockedExact.includes(moduleName)) {
    return { type: 'empty' };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// -------------------------------------------------------------------
// 5. Source extensions -- include monorepo TypeScript sources
// -------------------------------------------------------------------
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

// -------------------------------------------------------------------
// 6. Apply NativeWind
// -------------------------------------------------------------------
module.exports = withNativeWind(config, { input: './global.css' });
```

### Understanding Rush node_modules layout

Rush uses `common/temp/node_modules/` as the central install location. Packages are hoisted there and symlinked into each project's `node_modules/`. Metro needs both paths:

```
huly-platform/
  common/
    temp/
      node_modules/          <-- Rush hoisted packages
  mobile/
    node_modules/            <-- Symlinks + mobile-specific packages
  foundations/
    core/
      packages/
        api-client/          <-- @hcengineering/api-client source
        account-client/      <-- @hcengineering/account-client source
  plugins/
    tracker/                 <-- @hcengineering/tracker types
    chunter/                 <-- @hcengineering/chunter types
    contact/                 <-- @hcengineering/contact types
```

### Verifying single React instance

After configuring Metro, verify there is only one React copy:

```bash
# From mobile/ directory
npx metro-inspector-proxy &
npx expo start --dev-client

# In the Metro terminal, check for duplicate warnings:
# "Warning: Invalid hook call" = duplicate React
```

If you see duplicate React errors, the `extraNodeModules` mapping is missing or wrong. The `react` entry must point to the exact copy in `mobile/node_modules/react`.

### Adding a new @hcengineering package

When importing a new Huly package into the mobile app:

1. **Check the safety table above.** If the package is not listed, inspect its `package.json` dependencies for Node builtins.
2. **Add to mobile/package.json** with `workspace:^` version.
3. **Run `rush update`** to symlink it.
4. **Test Metro resolution** with `npx expo start` -- watch for "Unable to resolve module" errors.
5. **If it transitively imports a blocked package**, add that dependency to the `resolveRequest` blocklist.

```jsonc
// mobile/package.json -- adding a new safe package
{
  "dependencies": {
    "@hcengineering/tracker": "workspace:^",
    "@hcengineering/chunter": "workspace:^",
    "@hcengineering/contact": "workspace:^",
    "@hcengineering/notification": "workspace:^"
  }
}
```

### Handling transitive Node.js dependencies

Some safe packages may transitively import code that references Node builtins. The `resolveRequest` handler returns `{ type: 'empty' }` for these, which gives Metro an empty module instead of crashing. This is safe only when the Node-dependent code path is never actually called at runtime.

For packages where the Node code IS called at runtime, you need a polyfill:

```javascript
// metro.config.js -- polyfill example (only when actually needed)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'buffer': require.resolve('buffer/'),     // npm install buffer
  'events': require.resolve('events/'),      // npm install events
};
```

**Prefer blocking over polyfilling.** Only polyfill when the mobile code path actually calls the Node API.

## When

### When to modify metro.config.js

| Situation | Action |
|---|---|
| Adding a new @hcengineering/* dependency | Check safety table, add watchFolder if needed |
| Metro "Unable to resolve module" error | Check if module is blocked, add to nodeModulesPaths, or block it |
| "Invalid hook call" error | Verify React deduplication in extraNodeModules |
| New Node builtin appearing in bundle | Add to blockedExact list in resolveRequest |
| New Svelte/DOM dependency pulled in transitively | Add prefix to blockedPrefixes list |
| Adding a native module that needs custom resolver | Add to resolver.extraNodeModules |

### When to use workspace:^ vs fixed versions

| Package source | Version strategy |
|---|---|
| @hcengineering/* monorepo packages | `workspace:^` -- Rush resolves to local source |
| Expo SDK packages | Exact version from `npx expo install` |
| Third-party native modules | Compatible version for SDK 55 |
| Pure JS libraries (lodash, date-fns) | `^` semver range |

### When Metro cache needs clearing

```bash
# After changing metro.config.js
npx expo start --clear

# After Rush update changes node_modules layout
rm -rf mobile/node_modules/.cache
npx expo start --clear

# After upgrading Expo SDK
npx expo start --clear
```

## Never

- **Never import from `@hcengineering/ui` or `@hcengineering/presentation` in mobile code.** These are Svelte packages with browser DOM dependencies. They will crash Metro or fail at runtime.

```typescript
// WRONG -- Svelte package with DOM dependencies
import { Button } from '@hcengineering/ui';
import { getClient } from '@hcengineering/presentation';

// RIGHT -- use mobile equivalents
import { Button } from '@/components/ui/button';
import { getApiClient } from '@/client/api';
```

- **Never import `@hcengineering/api-client/storage` directly.** The storage client uses Node `stream`. Use `expo-file-system` for mobile file operations instead.

```typescript
// WRONG -- uses Node stream
import { StorageClient } from '@hcengineering/api-client/storage';

// RIGHT -- use expo-file-system with REST endpoints
import * as FileSystem from 'expo-file-system';
const downloadResult = await FileSystem.downloadAsync(fileUrl, localPath, {
  headers: { Authorization: `Bearer ${token}` },
});
```

- **Never skip the React deduplication step.** Without `extraNodeModules` pointing to a single React copy, monorepo symlinks cause multiple React instances, breaking all hooks.
- **Never add polyfills for Node builtins without confirming the code path is actually called.** Polyfills increase bundle size. Block first, polyfill only when blocking causes runtime errors.
- **Never use `require.resolve()` for monorepo packages in Metro config.** Rush symlinks may resolve to unexpected locations. Use explicit `path.resolve()` with known directory paths.
- **Never modify `common/temp/node_modules/` directly.** Changes are overwritten by `rush update`. All Metro configuration goes in `mobile/metro.config.js`.
