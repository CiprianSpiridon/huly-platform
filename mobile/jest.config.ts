/**
 * Jest configuration for Huly mobile app.
 *
 * Uses jest-expo preset with RNTL, path aliases, and comprehensive mocking
 * for Expo modules and @hcengineering packages.
 */

import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|@hcengineering/.*|nativewind|react-native-css-interop|react-native-reanimated|@gorhom/bottom-sheet|react-native-gesture-handler)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!src/app/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './src/store/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/repositories/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/maestro/'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  clearMocks: true,
}

export default config
