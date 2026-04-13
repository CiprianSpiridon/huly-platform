/**
 * Type declarations for @expo/vector-icons.
 *
 * The package is a transitive dependency of expo but may not be
 * hoisted to the local node_modules in Rush. At runtime it is
 * available via the Expo managed workflow. This declaration provides
 * the minimum types needed for TypeScript compilation.
 */

declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react'
  import type { TextStyle, StyleProp } from 'react-native'

  interface IconProps {
    name: string
    size?: number
    color?: string
    style?: StyleProp<TextStyle>
    accessibilityLabel?: string
  }

  export const Ionicons: ComponentType<IconProps>
  export const MaterialIcons: ComponentType<IconProps>
  export const MaterialCommunityIcons: ComponentType<IconProps>
  export const FontAwesome: ComponentType<IconProps>
  export const Feather: ComponentType<IconProps>
  export const AntDesign: ComponentType<IconProps>
  export const Entypo: ComponentType<IconProps>
  export const EvilIcons: ComponentType<IconProps>
  export const Foundation: ComponentType<IconProps>
  export const Octicons: ComponentType<IconProps>
  export const SimpleLineIcons: ComponentType<IconProps>
  export const Zocial: ComponentType<IconProps>
}
