const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const monorepoRoot = path.resolve(__dirname, '..')

const config = getDefaultConfig(__dirname)

// -------------------------------------------------------------------
// 1. Watch folders -- tell Metro about monorepo packages
// -------------------------------------------------------------------
config.watchFolders = [monorepoRoot]

// -------------------------------------------------------------------
// 2. Node module resolution -- search local first, then Rush hoisted
// -------------------------------------------------------------------
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'common', 'temp', 'node_modules'),
]

// -------------------------------------------------------------------
// 3. Deduplicate React -- ensure single copy across all packages
// -------------------------------------------------------------------
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, 'node_modules', 'react'),
  'react-native': path.resolve(__dirname, 'node_modules', 'react-native'),
  'react/jsx-runtime': path.resolve(__dirname, 'node_modules', 'react', 'jsx-runtime'),
}

// -------------------------------------------------------------------
// 4. Block server-only / Svelte / Node builtin modules
// -------------------------------------------------------------------
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const blockedPrefixes = [
    '@hcengineering/server-',
    '@hcengineering/model-',
    '@hcengineering/ui',
    '@hcengineering/presentation',
    '@hcengineering/theme',
    // Rich text / editor deps pulled by api-client barrel
    '@tiptap/',
    'prosemirror-',
    // Plugin transitive deps (svelte UI chain)
    '@hcengineering/view',
    '@hcengineering/preference',
    '@hcengineering/workbench',
    '@hcengineering/setting',
    '@hcengineering/templates',
    '@hcengineering/card',
    '@hcengineering/tags',
    '@hcengineering/time',
    '@hcengineering/attachment',
  ]

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
    // api-client transitive deps
    '@hcengineering/client-resources',
    '@hcengineering/collaborator-client',
    '@hcengineering/text',
    '@hcengineering/text-core',
    '@hcengineering/text-html',
    '@hcengineering/text-markdown',
    'markdown-it',
    'ws',
    // Plugin transitive deps
    'dompurify',
    'autolinker',
    'svelte',
  ]

  if (blockedPrefixes.some((prefix) => moduleName.startsWith(prefix))) {
    return { type: 'empty' }
  }

  if (blockedExact.includes(moduleName)) {
    return { type: 'empty' }
  }

  return context.resolveRequest(context, moduleName, platform)
}

// -------------------------------------------------------------------
// 5. Source extensions
// -------------------------------------------------------------------
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs']

// -------------------------------------------------------------------
// 6. Apply NativeWind
// -------------------------------------------------------------------
module.exports = withNativeWind(config, { input: './global.css' })
