/**
 * Haptics helper for Huly mobile.
 *
 * Wraps expo-haptics so:
 *  - All calls are try/caught — no crashes on unsupported hardware.
 *  - System Reduce Motion is respected (cached for 5s to avoid repeated bridge hits).
 *  - Unsupported platforms (web, some emulators) silently no-op.
 *
 * Import this module — never call expo-haptics directly from components.
 */

import { AccessibilityInfo, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

let reduceMotionCache: { value: boolean, until: number } | null = null
const REDUCE_MOTION_TTL_MS = 5_000

async function isReduceMotionEnabled(): Promise<boolean> {
  const now = Date.now()
  if (reduceMotionCache != null && reduceMotionCache.until > now) {
    return reduceMotionCache.value
  }
  try {
    const enabled = await AccessibilityInfo.isReduceMotionEnabled()
    reduceMotionCache = { value: enabled, until: now + REDUCE_MOTION_TTL_MS }
    return enabled
  } catch {
    // Fail open — default to "not reduced" so haptics still run when we can't check.
    return false
  }
}

function platformSupportsHaptics(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

async function runHaptic(fn: () => Promise<void> | void): Promise<void> {
  if (!platformSupportsHaptics()) return
  try {
    if (await isReduceMotionEnabled()) return
    await fn()
  } catch {
    // Swallow: device without haptic hardware, or bridge unavailable.
  }
}

export function lightImpact(): void {
  void runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function mediumImpact(): void {
  void runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

export function heavyImpact(): void {
  void runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

export function selection(): void {
  void runHaptic(() => Haptics.selectionAsync())
}

export function success(): void {
  void runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

export function warning(): void {
  void runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

export function error(): void {
  void runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
}

/** Clear the Reduce Motion cache. Call from tests. */
export function __resetHapticsCacheForTesting(): void {
  reduceMotionCache = null
}
