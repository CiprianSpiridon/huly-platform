/**
 * Avatar circle primitive.
 *
 * Shows an image avatar or initials with a deterministic background color.
 * Props-only, no data fetching, no side effects.
 */

import { View, Text } from 'react-native'
import { Image } from 'expo-image'

interface AvatarCircleProps {
  name: string
  imageUrl?: string | null
  size?: number
  testID?: string
}

const AVATAR_COLORS = [
  '#205DC2', '#2B6FD9', '#34D583', '#FACC15',
  '#EF4444', '#3B82F6', '#A855F7', '#EC4899',
  '#F97316', '#14B8A6',
] as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (name[0] ?? '?').toUpperCase()
}

function getDeterministicColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]!
}

function AvatarCircle({ name, imageUrl, size = 32, testID }: AvatarCircleProps): React.ReactNode {
  const initials = getInitials(name)

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        recyclingKey={name}
        accessibilityLabel={`Avatar of ${name}`}
        testID={testID}
      />
    )
  }

  const bgColor = getDeterministicColor(name)

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }}
      className="items-center justify-center"
      accessibilityRole="image"
      accessibilityLabel={`Avatar of ${name}`}
      testID={testID}
    >
      <Text
        className="font-sans-bold text-on-accent"
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </Text>
    </View>
  )
}

export { AvatarCircle }
export type { AvatarCircleProps }
