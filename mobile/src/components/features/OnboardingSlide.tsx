/**
 * Single onboarding slide component.
 *
 * Props-only presentational component for the swipeable onboarding flow.
 */

import { View, Text, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface OnboardingSlideProps {
  icon: string
  title: string
  description: string
  color: string
}

function OnboardingSlide({ icon, title, description, color }: OnboardingSlideProps): React.ReactNode {
  const { width } = useWindowDimensions()

  return (
    <View
      style={{ width }}
      className="flex-1 items-center justify-center px-8"
    >
      <View
        className="items-center justify-center rounded-2xl mb-8"
        style={{ width: 96, height: 96, backgroundColor: `${color}20` }}
        accessibilityElementsHidden
      >
        <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={48} color={color} />
      </View>

      <Text
        className="font-sans-bold text-2xl text-content-primary text-center mb-4"
        accessibilityRole="header"
      >
        {title}
      </Text>

      <Text className="font-sans text-base text-content-secondary text-center leading-6">
        {description}
      </Text>
    </View>
  )
}

export { OnboardingSlide }
export type { OnboardingSlideProps }
