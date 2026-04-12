/**
 * Status chip primitive.
 *
 * Renders a small colored chip for issue status display.
 * Props-only, no data fetching, no side effects.
 */

import { View, Text } from 'react-native'

type StatusCategory = 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled'

interface StatusChipProps {
  name: string
  category?: StatusCategory
  testID?: string
}

const CATEGORY_STYLES: Record<StatusCategory, { bg: string; text: string }> = {
  backlog: { bg: 'bg-surface-tertiary', text: 'text-content-secondary' },
  unstarted: { bg: 'bg-surface-tertiary', text: 'text-content-secondary' },
  started: { bg: 'bg-accent-subtle', text: 'text-accent-primary' },
  completed: { bg: 'bg-positive/15', text: 'text-positive' },
  canceled: { bg: 'bg-negative/15', text: 'text-negative' },
}

function StatusChip({ name, category = 'unstarted', testID }: StatusChipProps): React.ReactNode {
  const style = CATEGORY_STYLES[category]

  return (
    <View
      className={`flex-row items-center rounded-sm px-2 py-0.5 ${style.bg}`}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${name}`}
      testID={testID}
    >
      <Text className={`font-sans-medium text-xs ${style.text}`}>
        {name}
      </Text>
    </View>
  )
}

export { StatusChip }
export type { StatusChipProps, StatusCategory }
