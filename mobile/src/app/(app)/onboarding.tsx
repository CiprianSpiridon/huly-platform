/**
 * Onboarding screen.
 *
 * Shows 4 swipeable slides on first login. Uses a FlatList with
 * pagingEnabled for native swipe behavior. Completes on "Get Started"
 * press and sets hasCompletedOnboarding flag in settings store.
 */

import { useCallback, useRef, useState } from 'react'
import { View, Text, Pressable, FlatList, useWindowDimensions, type ViewToken } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { useSettingsStore } from '@/store/settings'
import { OnboardingSlide } from '@/components/features/OnboardingSlide'

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------

interface SlideData {
  id: string
  icon: string
  title: string
  description: string
  color: string
}

const SLIDES: SlideData[] = [
  {
    id: 'welcome',
    icon: 'rocket-outline',
    title: 'Welcome to Huly',
    description: 'Your all-in-one project management platform, now in your pocket. Track issues, collaborate with your team, and stay updated wherever you go.',
    color: '#205DC2',
  },
  {
    id: 'tracker',
    icon: 'checkmark-circle-outline',
    title: 'Track Issues',
    description: 'Create, update, and manage issues on the go. Set priorities, assign team members, and track progress from anywhere.',
    color: '#34D583',
  },
  {
    id: 'chat',
    icon: 'chatbubbles-outline',
    title: 'Team Chat',
    description: 'Stay connected with your team through channels and direct messages. Share files, react to messages, and keep conversations flowing.',
    color: '#FACC15',
  },
  {
    id: 'notifications',
    icon: 'notifications-outline',
    title: 'Stay Notified',
    description: 'Never miss an update. Get real-time notifications for mentions, assignments, and important changes to your projects.',
    color: '#3B82F6',
  },
]

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen(): React.ReactNode {
  const { width } = useWindowDimensions()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList<SlideData>>(null)
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding)

  const isLastSlide = currentIndex === SLIDES.length - 1

  const handleComplete = useCallback(async () => {
    await completeOnboarding()
    router.replace('/(app)/tracker' as Href)
  }, [completeOnboarding])

  const handleSkip = useCallback(async () => {
    await completeOnboarding()
    router.replace('/(app)/tracker' as Href)
  }, [completeOnboarding])

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      void handleComplete()
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    }
  }, [isLastSlide, currentIndex, handleComplete])

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<SlideData>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index)
      }
    },
    []
  )

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {/* Skip button */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable
          onPress={() => void handleSkip()}
          className="py-2 px-4 min-h-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text className="font-sans-medium text-sm text-accent-primary">Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => (
          <OnboardingSlide
            icon={item.icon}
            title={item.title}
            description={item.description}
            color={item.color}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Pagination dots + action button */}
      <View className="px-8 pb-8">
        {/* Dots */}
        <View
          className="flex-row items-center justify-center gap-2 mb-8"
          accessibilityRole="tablist"
          accessibilityLabel={`Page ${currentIndex + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              className={`h-2 rounded-full ${
                index === currentIndex ? 'w-6 bg-accent-primary' : 'w-2 bg-surface-tertiary'
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === currentIndex }}
            />
          ))}
        </View>

        {/* Action button */}
        <Pressable
          className="bg-primary rounded-lg py-4 min-h-[44px] items-center justify-center"
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? 'Get started' : 'Next slide'}
        >
          <Text className="font-sans-semibold text-base text-on-accent">
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
