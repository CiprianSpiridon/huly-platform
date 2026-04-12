import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-4">
        <View className="items-center gap-4">
          <Text className="font-sans-bold text-3xl text-caption">
            Huly
          </Text>
          <Text className="font-sans text-base text-content">
            All-in-one project management
          </Text>
          <View className="mt-2 rounded-md bg-primary px-4 py-2">
            <Text className="font-sans-medium text-base text-white">
              Get Started
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
