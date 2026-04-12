/**
 * Huly mobile design tokens — shadows.
 *
 * React Native shadows differ from CSS — these provide the
 * cross-platform shadow properties.
 *
 * Shadow values are derived from packages/theme/styles/_vars.scss
 * and the dark theme in _colors.scss.
 */

export interface NativeShadow {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

/** Popover: blur 12px, y-offset 8px */
export const popoverShadow: NativeShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 8,
} as const

/** Modal: blur 24px, y-offset 24px, spread 4px */
export const modalShadow: NativeShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 24 },
  shadowOpacity: 0.5,
  shadowRadius: 24,
  elevation: 24,
} as const

/** Card: y-offset 16px, blur ~70px */
export const cardShadow: NativeShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.5,
  shadowRadius: 35,
  elevation: 16,
} as const

/** Button: subtle 1px shadow */
export const buttonShadow: NativeShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15,
  shadowRadius: 1,
  elevation: 1,
} as const

/** Accent: light shadow for elevated cards */
export const accentShadow: NativeShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
} as const

export const shadows = {
  popover: popoverShadow,
  modal: modalShadow,
  card: cardShadow,
  button: buttonShadow,
  accent: accentShadow,
} as const
