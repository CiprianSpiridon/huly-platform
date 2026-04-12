/**
 * Profile header for the settings screen.
 *
 * Displays avatar circle with initials fallback, full name, and email.
 * Props-only -- receives profile data from the screen.
 */

import { View, Text } from 'react-native'

import { AvatarCircle } from '@/components/ui/AvatarCircle'

interface ProfileHeaderProps {
  firstName: string
  lastName: string
  email: string | null
}

function ProfileHeader({ firstName, lastName, email }: ProfileHeaderProps): React.ReactNode {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User'

  return (
    <View
      className="items-center px-4 py-6"
      accessibilityRole="summary"
      accessibilityLabel={`Profile: ${fullName}`}
    >
      <AvatarCircle name={fullName} size={64} />
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
