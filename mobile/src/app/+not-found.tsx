import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

/**
 * 404 fallback screen.
 *
 * Displayed when expo-router cannot match the current URL to any
 * defined route. Provides a "Go Home" button that navigates back
 * to the root index.
 */
export default function NotFoundScreen(): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface-primary">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-surface-tertiary items-center justify-center mb-6">
          <Ionicons name="warning-outline" size={32} color="#77818B" />
        </View>

        <Text className="font-sans-bold text-xl text-content-primary mb-2 text-center">
          Page not found
        </Text>

        <Text className="font-sans text-sm text-content-secondary text-center mb-8">
          The page you are looking for does not exist or has been moved.
        </Text>

        <Pressable
          className="bg-accent-primary rounded-lg px-6 min-h-[44px] items-center justify-center"
          onPress={() => {
            router.replace('/')
          }}
          accessibilityRole="button"
          accessibilityLabel="Go Home"
        >
          <Text className="font-sans-semibold text-sm text-white">
            Go Home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
