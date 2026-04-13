/**
 * Jest setup file.
 *
 * Mocks native modules (expo-secure-store, expo-router, expo-image,
 * expo-notifications, reanimated, flash-list, vector-icons, async-storage)
 * and silences NativeWind warnings.
 */

import '@testing-library/jest-native/extend-expect'

// ---------------------------------------------------------------------------
// expo-secure-store mock
// ---------------------------------------------------------------------------

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// @react-native-async-storage/async-storage mock
// ---------------------------------------------------------------------------

const asyncStorageData: Record<string, string> = {}

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageData[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageData[key] = value
    return Promise.resolve()
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageData[key]
    return Promise.resolve()
  }),
  clear: jest.fn(() => {
    Object.keys(asyncStorageData).forEach((key) => delete asyncStorageData[key])
    return Promise.resolve()
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(asyncStorageData))),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, asyncStorageData[key] ?? null]))
  ),
  multiSet: jest.fn((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      asyncStorageData[key] = value
    })
    return Promise.resolve()
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => delete asyncStorageData[key])
    return Promise.resolve()
  }),
}))

// ---------------------------------------------------------------------------
// expo-router mock
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    navigate: jest.fn(),
  },
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  useGlobalSearchParams: jest.fn().mockReturnValue({}),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    navigate: jest.fn(),
  })),
  Redirect: jest.fn(() => null),
  Stack: {
    Screen: jest.fn(() => null),
  },
  Tabs: {
    Screen: jest.fn(() => null),
  },
  Link: jest.fn(({ children }: { children: React.ReactNode }) => children),
}))

// ---------------------------------------------------------------------------
// expo-image mock
// ---------------------------------------------------------------------------

jest.mock('expo-image', () => {
  const { View } = require('react-native')
  return {
    Image: jest.fn((props: Record<string, unknown>) => {
      return require('react').createElement(View, {
        testID: props.testID,
        accessibilityLabel: props.accessibilityLabel,
      })
    }),
  }
})

// ---------------------------------------------------------------------------
// @shopify/flash-list mock
// ---------------------------------------------------------------------------

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native')
  return {
    FlashList: FlatList,
  }
})

// ---------------------------------------------------------------------------
// expo-notifications mock
// ---------------------------------------------------------------------------

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-push-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}))

// ---------------------------------------------------------------------------
// expo-device mock
// ---------------------------------------------------------------------------

jest.mock('expo-device', () => ({
  isDevice: true,
}))

// ---------------------------------------------------------------------------
// expo-constants mock
// ---------------------------------------------------------------------------

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: { projectId: 'test-project-id' },
      router: { origin: 'https://app.huly.io' },
    },
  },
}))

// ---------------------------------------------------------------------------
// react-native-reanimated mock
// ---------------------------------------------------------------------------

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  Reanimated.default.call = () => {}
  return Reanimated
})

// ---------------------------------------------------------------------------
// @expo/vector-icons mock
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native')
  return {
    Ionicons: jest.fn((props: Record<string, unknown>) => {
      return require('react').createElement(View, {
        testID: props.testID,
        accessibilityLabel: props.name as string,
      })
    }),
  }
})

// ---------------------------------------------------------------------------
// @react-native-community/netinfo mock
// ---------------------------------------------------------------------------

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}))

// ---------------------------------------------------------------------------
// @gorhom/bottom-sheet mock
// ---------------------------------------------------------------------------

jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: View,
    BottomSheetView: View,
    BottomSheetScrollView: View,
    BottomSheetTextInput: View,
    BottomSheetBackdrop: View,
  }
})

// ---------------------------------------------------------------------------
// Silence NativeWind warnings in test output
// ---------------------------------------------------------------------------

const originalWarn = console.warn
beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('NativeWind')) return
    originalWarn(...args)
  }
})
afterAll(() => {
  console.warn = originalWarn
})
