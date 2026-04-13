/**
 * Error fallback UI.
 *
 * Shown when an ErrorBoundary catches an unhandled render error.
 * Provides a "Restart" button and shows error details in __DEV__ mode.
 */

import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface ErrorFallbackProps {
  error: Error
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="warning-outline" size={64} color="#EF4444" />

        <Text
          className="font-sans-bold text-xl text-content-primary mt-6 text-center"
          accessibilityRole="header"
        >
          Something went wrong
        </Text>

        <Text className="font-sans text-base text-content-secondary mt-3 text-center">
          An unexpected error occurred. Please try again.
        </Text>

        {__DEV__ ? (
          <ScrollView
            className="mt-4 max-h-40 w-full bg-surface-tertiary rounded-md p-3"
            accessibilityLabel="Error details"
          >
            <Text className="font-sans text-xs text-status-error">
              {error.name}: {error.message}
            </Text>
            {error.stack != null ? (
              <Text className="font-sans text-xs text-content-tertiary mt-2" numberOfLines={10}>
                {error.stack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <Pressable
          className="bg-primary rounded-md px-8 py-3 mt-8 min-h-[44px] items-center justify-center"
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Restart the app"
        >
          <Text className="font-sans-semibold text-sm text-on-accent">Restart</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

export { ErrorFallback }
export type { ErrorFallbackProps }
