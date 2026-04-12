import { View, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Placeholder screen for the authenticated app area.
 * Will be replaced by the tracker/tabs phase.
 */
export default function AppHomeScreen(): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center gap-4 px-4">
        <ActivityIndicator size="large" color="#205DC2" />
        <Text className="font-sans text-base text-content">
          Loading workspace...
        </Text>
      </View>
    </SafeAreaView>
  )
}
