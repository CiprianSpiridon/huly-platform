/**
 * Huly mobile design tokens — avatar color palette.
 *
 * 24-color avatar palette ported from packages/ui/src/colors.ts.
 * Each entry contains the HSL source values and pre-computed hex background.
 *
 * The dark palette increases saturation by +50 and decreases lightness by -20
 * relative to the light palette (matching the web app's defineAvatarColor logic).
 */

export interface AvatarColor {
  name: string
  /** Light theme background hex */
  light: string
  /** Dark theme background hex (higher saturation, lower lightness) */
  dark: string
}

/**
 * Utility: convert HSL (h: 0-360, s: 0-100, l: 0-100) to hex string.
 */
function hslToHex (h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number, g: number, b: number
  if (sNorm === 0) {
    r = g = b = lNorm
  } else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
    const p = 2 * lNorm - q
    const hNorm = h / 360
    r = hue2rgb(p, q, hNorm + 1 / 3)
    g = hue2rgb(p, q, hNorm)
    b = hue2rgb(p, q, hNorm - 1 / 3)
  }

  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length < 2 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 24-color avatar palette.
 *
 * Light values: original HSL from packages/ui/src/colors.ts avatarWhiteColors.
 * Dark values: saturation += 50, lightness -= 20 (from avatarDarkColors).
 */
export const avatarColors: readonly AvatarColor[] = [
  { name: 'Unassigned', light: hslToHex(0, 0, 91), dark: hslToHex(0, 0, 91) },
  { name: 'Magic', light: hslToHex(235, 14, 89), dark: hslToHex(235, 64, 69) },
  { name: 'Waterlily', light: hslToHex(222, 16, 87), dark: hslToHex(222, 66, 67) },
  { name: 'Light', light: hslToHex(216, 16, 87), dark: hslToHex(216, 66, 67) },
  { name: 'Aqua', light: hslToHex(200, 8, 85), dark: hslToHex(200, 58, 65) },
  { name: 'Turtle', light: hslToHex(192, 14, 85), dark: hslToHex(192, 64, 65) },
  { name: 'Ocean', light: hslToHex(186, 13, 85), dark: hslToHex(186, 63, 65) },
  { name: 'Heather', light: hslToHex(153, 11, 86), dark: hslToHex(153, 61, 66) },
  { name: 'Juice', light: hslToHex(108, 10, 90), dark: hslToHex(108, 60, 70) },
  { name: 'Lime', light: hslToHex(70, 9, 87), dark: hslToHex(70, 59, 67) },
  { name: 'Warmth', light: hslToHex(45, 13, 88), dark: hslToHex(45, 63, 68) },
  { name: 'Desert', light: hslToHex(30, 14, 89), dark: hslToHex(30, 64, 69) },
  { name: 'Sand', light: hslToHex(25, 14, 89), dark: hslToHex(25, 64, 69) },
  { name: 'Rust', light: hslToHex(23, 12, 87), dark: hslToHex(23, 62, 67) },
  { name: 'Magnolia', light: hslToHex(334, 11, 88), dark: hslToHex(334, 61, 68) },
  { name: 'Blossom', light: hslToHex(300, 14, 89), dark: hslToHex(300, 64, 69) },
  { name: 'Unicorn', light: hslToHex(274, 11, 88), dark: hslToHex(274, 61, 68) },
  { name: 'Violet', light: hslToHex(252, 16, 87), dark: hslToHex(252, 66, 67) },
  { name: 'Happy', light: hslToHex(232, 16, 87), dark: hslToHex(232, 66, 67) },
  { name: 'Blueish', light: hslToHex(222, 13, 85), dark: hslToHex(222, 63, 65) },
  { name: 'Baby blue', light: hslToHex(210, 12, 87), dark: hslToHex(210, 62, 67) },
  { name: 'Grey 3', light: hslToHex(213, 9, 81), dark: hslToHex(213, 9, 81) },
  { name: 'Grey 2', light: hslToHex(210, 10, 84), dark: hslToHex(210, 10, 84) },
  { name: 'Grey 1', light: hslToHex(210, 11, 89), dark: hslToHex(210, 11, 89) },
] as const
