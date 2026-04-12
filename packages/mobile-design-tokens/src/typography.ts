/**
 * Huly mobile design tokens — typography.
 *
 * IBM Plex Sans is the Huly platform font family.
 * Sizes match the web app's font scale.
 */

export const fontFamily = {
  sans: 'IBMPlexSans-Regular',
  sansMedium: 'IBMPlexSans-Medium',
  sansSemiBold: 'IBMPlexSans-SemiBold',
  sansBold: 'IBMPlexSans-Bold',
} as const

export const fontSize = {
  /** 11px — smallest labels, timestamps */
  xs: 11,
  /** 12px — secondary text, metadata */
  sm: 12,
  /** 13px — compact UI text */
  md: 13,
  /** 14px — default body */
  base: 14,
  /** 15px — slightly larger body */
  lg: 15,
  /** 16px — section headers */
  xl: 16,
  /** 18px — page headers */
  '2xl': 18,
  /** 20px — large titles */
  '3xl': 20,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const lineHeight = {
  xs: 16,
  sm: 16,
  md: 18,
  base: 20,
  lg: 20,
  xl: 24,
  '2xl': 24,
  '3xl': 28,
} as const
