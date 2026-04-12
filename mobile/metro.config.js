// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

// ─── Monorepo watchFolders ────────────────────────────────────────────
// Metro needs to watch the monorepo root to resolve workspace:^ packages.
config.watchFolders = [monorepoRoot]

// ─── Resolver ─────────────────────────────────────────────────────────
// 1. Tell Metro where to find node_modules installed by Rush/pnpm.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'common', 'temp', 'node_modules'),
]

// 2. CRITICAL: Exclude 'svelte' from resolverMainFields.
//    Every @hcengineering/* package.json has a "svelte" field pointing to
//    raw src/ TypeScript files, which would break Metro bundling.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']

// 3. Ensure single React/React-Native instance across all workspace packages.
//    Without this, workspace packages may resolve their own copy of react,
//    causing the "Invalid hook call" error.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
  'react-dom': path.resolve(projectRoot, 'node_modules', 'react-dom'),
}

// ─── NativeWind ───────────────────────────────────────────────────────
module.exports = withNativeWind(config, {
  input: './global.css',
})
