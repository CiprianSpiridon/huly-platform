/**
 * Huly mobile design tokens — spacing scale.
 *
 * Ported from packages/theme/styles/_vars.scss spacing variables.
 * Values converted from rem (1rem = 16px) to px for React Native.
 */

export const spacing = {
  /** 0.125rem = 2px */
  '0.25': 2,
  /** 0.25rem = 4px */
  '0.5': 4,
  /** 0.375rem = 6px */
  '0.75': 6,
  /** 0.5rem = 8px */
  '1': 8,
  /** 0.625rem = 10px */
  '1.25': 10,
  /** 0.75rem = 12px */
  '1.5': 12,
  /** 0.875rem = 14px */
  '1.75': 14,
  /** 1rem = 16px */
  '2': 16,
  /** 1.125rem = 18px */
  '2.25': 18,
  /** 1.25rem = 20px */
  '2.5': 20,
  /** 1.375rem = 22px */
  '2.75': 22,
  /** 1.5rem = 24px */
  '3': 24,
  /** 1.625rem = 26px */
  '3.25': 26,
  /** 1.75rem = 28px */
  '3.5': 28,
  /** 2rem = 32px */
  '4': 32,
  /** 2.25rem = 36px */
  '4.5': 36,
  /** 2.5rem = 40px */
  '5': 40,
  /** 2.75rem = 44px */
  '5.5': 44,
  /** 3rem = 48px */
  '6': 48,
  /** 3.5rem = 56px */
  '6.5': 56,
  /** 4rem = 64px */
  '7': 64,
  /** 5rem = 80px */
  '8': 80,
  /** 6rem = 96px */
  '9': 96,
  /** 7.5rem = 120px */
  '10': 120,
} as const

/**
 * Spacing scale as pixel strings for Tailwind CSS.
 * E.g. { '0.25': '2px', '0.5': '4px', ... }
 */
export const spacingPx = Object.fromEntries(
  Object.entries(spacing).map(([key, val]) => [key, `${val}px`])
) as { [K in keyof typeof spacing]: string }
