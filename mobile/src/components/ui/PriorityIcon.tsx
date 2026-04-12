/**
 * Priority icon primitive.
 *
 * Renders a colored priority indicator matching the Huly design system.
 * Props-only, no data fetching, no side effects.
 */

import { View, Text } from 'react-native'

/**
 * Mirrors @hcengineering/tracker IssuePriority enum values.
 * Cannot import the real enum because it pulls in svelte via @hcengineering/ui.
 */
export const ISSUE_PRIORITY = {
  NoPriority: 0,
  Urgent: 1,
  High: 2,
  Medium: 3,
  Low: 4,
} as const

export type IssuePriorityValue = (typeof ISSUE_PRIORITY)[keyof typeof ISSUE_PRIORITY]

interface PriorityIconProps {
  priority: number
  size?: number
  testID?: string
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; symbol: string }> = {
  [ISSUE_PRIORITY.NoPriority]: { label: 'No priority', color: 'bg-content-tertiary', symbol: '---' },
  [ISSUE_PRIORITY.Urgent]: { label: 'Urgent', color: 'bg-priority-urgent', symbol: '!!!' },
  [ISSUE_PRIORITY.High]: { label: 'High', color: 'bg-priority-high', symbol: '!!' },
  [ISSUE_PRIORITY.Medium]: { label: 'Medium', color: 'bg-priority-medium', symbol: '!' },
  [ISSUE_PRIORITY.Low]: { label: 'Low', color: 'bg-priority-low', symbol: '-' },
}

function PriorityIcon({ priority, size = 20, testID }: PriorityIconProps): React.ReactNode {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG[ISSUE_PRIORITY.NoPriority]!

  return (
    <View
      className={`items-center justify-center rounded-xs ${config.color}`}
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={`Priority: ${config.label}`}
      testID={testID}
    >
      <Text
        className="font-sans-bold text-content-primary"
        style={{ fontSize: size * 0.45 }}
      >
        {config.symbol}
      </Text>
    </View>
  )
}

export { PriorityIcon }
export type { PriorityIconProps }
