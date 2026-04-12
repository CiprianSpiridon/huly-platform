import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Placeholder inbox screen. Will be implemented in the notification phase.
 */
export default function InboxScreen(): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 items-center justify-center px-4">
        <Text className="font-sans-medium text-lg text-caption">Inbox</Text>
        <Text className="font-sans text-sm text-content mt-2 text-center">
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  )
}
