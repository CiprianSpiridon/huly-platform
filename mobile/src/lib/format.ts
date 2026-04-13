/**
 * Pure formatting utilities.
 *
 * No React, no side effects. Safe for use in repositories, hooks, and components.
 */

/**
 * Format a byte count into a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB'] as const
  const k = 1024
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const value = bytes / Math.pow(k, i)
  const unit = units[i] ?? 'B'
  return `${value.toFixed(i === 0 ? 0 : 1)} ${unit}`
}

/**
 * Format a timestamp into a relative time string (e.g. "2m ago", "3h ago", "5d ago").
 */
export function formatRelativeTime(timestamp: number): string {
  if (timestamp === 0) return ''
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}
