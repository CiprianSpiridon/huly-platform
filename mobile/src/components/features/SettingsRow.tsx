/**
 * Settings row primitive for the settings screen.
 *
 * Renders a pressable row with label, optional value text,
 * and optional right chevron. Minimum 44px touch target.
 */

import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface SettingsRowProps {
  label: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
  destructive?: boolean
  accessibilityLabel?: string
}

function SettingsRow({
  label,
  value,
  onPress,
  showChevron = false,
  destructive = false,
  accessibilityLabel,
}: SettingsRowProps): React.ReactNode {
  const textColor = destructive ? 'text-status-error' : 'text-content-primary'

  return (
    <Pressable
      className="flex-row items-center justify-between px-4 min-h-[44px] py-3 active:bg-surface-tertiary"
      onPress={onPress}
      disabled={onPress == null}
      accessibilityRole={onPress != null ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text className={`font-sans text-base ${textColor} flex-1`}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        {value != null && (
          <Text className="font-sans text-sm text-content-secondary">
            {value}
          </Text>
        )}
        {showChevron && onPress != null && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#77818B"
          />
        )}
      </View>
    </Pressable>
  )
}

export { SettingsRow }
export type { SettingsRowProps }
