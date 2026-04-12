import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#161719' }}>
      <View className="flex-1 items-center justify-center px-3">
        <View className="items-center gap-3">
          <Text className="font-sans-bold text-3xl text-caption">
            Huly
          </Text>
          <Text className="font-sans text-base text-content">
            All-in-one project management
          </Text>
          <View className="mt-2 rounded-md bg-primary px-3 py-1.5">
            <Text className="font-sans-medium text-base text-caption">
              Get Started
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
