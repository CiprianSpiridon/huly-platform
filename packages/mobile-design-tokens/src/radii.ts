/**
 * Huly mobile design tokens — border radii.
 *
 * Ported from packages/theme/styles/_vars.scss border radius variables.
 * Values converted from rem (1rem = 16px) to px.
 */

export const radii = {
  /** 0.125rem = 2px — min border radius */
  xs: 2,
  /** 0.25rem = 4px — extra-small */
  sm: 4,
  /** 0.375rem = 6px — small */
  'sm-focus': 6,
  /** 0.5rem = 8px — medium */
  md: 8,
  /** 0.625rem = 10px — medium focus */
  'md-focus': 10,
  /** 1rem = 16px — large */
  lg: 16,
  /** 1.125rem = 18px — large focus */
  'lg-focus': 18,
  /** Full rounding */
  full: 9999,
} as const

/**
 * Border radii as pixel strings for Tailwind CSS.
 */
export const radiiPx = Object.fromEntries(
  Object.entries(radii).map(([key, val]) => [key, `${val}px`])
) as { [K in keyof typeof radii]: string }
