/**
 * Profile header for the settings screen.
 *
 * Displays avatar circle with initials fallback, full name, and email.
 * When `onEditAvatar` is provided, renders a small edit icon overlay on
 * the avatar and makes the avatar pressable.
 */

import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { AvatarCircle } from '@/components/ui/AvatarCircle'

interface ProfileHeaderProps {
  firstName: string
  lastName: string
  email: string | null
  avatarUrl?: string | null
  onEditAvatar?: () => void
  isUploadingAvatar?: boolean
}

function ProfileHeader({
  firstName,
  lastName,
  email,
  avatarUrl,
  onEditAvatar,
  isUploadingAvatar = false,
}: ProfileHeaderProps): React.ReactNode {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User'
  const isEditable = onEditAvatar != null

  const avatarContent = (
    <View>
      <AvatarCircle name={fullName} imageUrl={avatarUrl} size={64} />
      {isEditable && (
        <View className="absolute bottom-0 right-0 bg-accent-primary rounded-full w-6 h-6 items-center justify-center border-2 border-surface-primary">
          {isUploadingAvatar ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          )}
        </View>
      )}
    </View>
  )

  return (
    <View
      className="items-center px-4 py-6"
      accessibilityRole="summary"
      accessibilityLabel={`Profile: ${fullName}`}
    >
      {isEditable ? (
        <Pressable
          onPress={onEditAvatar}
          disabled={isUploadingAvatar}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
        >
          {avatarContent}
        </Pressable>
      ) : (
        avatarContent
      )}
      <Text className="font-sans-semibold text-xl text-content-primary mt-3">
        {fullName}
      </Text>
      {email != null && (
        <Text className="font-sans text-sm text-content-secondary mt-1">
          {email}
        </Text>
      )}
    </View>
  )
}

export { ProfileHeader }
export type { ProfileHeaderProps }
