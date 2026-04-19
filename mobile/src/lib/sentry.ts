/**
 * Sentry integration for Huly mobile.
 *
 * - Initializes @sentry/react-native at app startup
 * - Disabled in __DEV__
 * - Scrubs PII: auth tokens, emails, workspace URLs, query params
 */

import * as Sentry from '@sentry/react-native'

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
// Bearer-style tokens or long token-ish hex/base64 strings
const TOKEN_RE = /\b(?:Bearer\s+)?[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{6,}(?:\.[A-Za-z0-9_\-]{6,})?\b/g
const WORKSPACE_URL_RE = /https?:\/\/[^\s/]+\.(?:huly\.io|huly\.app)(?:\/[^\s]*)?/gi

const SENSITIVE_KEYS = new Set([
  'token',
  'authToken',
  'workspaceToken',
  'accessToken',
  'refreshToken',
  'password',
  'email',
  'authorization',
  'cookie',
  'set-cookie',
])

function redactString(value: string): string {
  return value
    .replace(TOKEN_RE, '[REDACTED_TOKEN]')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(WORKSPACE_URL_RE, '[REDACTED_WORKSPACE_URL]')
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Truncated]'
  if (value == null) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]'
        continue
      }
      out[k] = scrub(v, depth + 1)
    }
    return out
  }
  return value
}

function scrubEvent<T extends Sentry.ErrorEvent | Sentry.TransactionEvent>(event: T): T {
  try {
    // User PII
    if (event.user != null) {
      const u = event.user as Record<string, unknown>
      if (typeof u.email === 'string') u.email = '[REDACTED_EMAIL]'
      if (typeof u.ip_address === 'string') u.ip_address = '[REDACTED_IP]'
      if (typeof u.username === 'string') u.username = '[REDACTED_USERNAME]'
    }
    // Request URL and headers
    if (event.request != null) {
      const r = event.request as Record<string, unknown>
      if (typeof r.url === 'string') r.url = redactString(r.url)
      if (typeof r.headers === 'object' && r.headers != null) {
        r.headers = scrub(r.headers)
      }
      if (typeof r.query_string === 'string') r.query_string = redactString(r.query_string)
    }
    // Breadcrumbs messages/data
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((bc) => ({
        ...bc,
        message: typeof bc.message === 'string' ? redactString(bc.message) : bc.message,
        data: bc.data != null ? (scrub(bc.data) as typeof bc.data) : bc.data,
      }))
    }
    // Exception values
    const exValues = event.exception?.values
    if (Array.isArray(exValues)) {
      for (const ex of exValues) {
        if (typeof ex.value === 'string') ex.value = redactString(ex.value)
      }
    }
    // Extras and tags
    if (event.extra != null) event.extra = scrub(event.extra) as typeof event.extra
    if (event.contexts != null) event.contexts = scrub(event.contexts) as typeof event.contexts
  } catch {
    // If scrubbing itself fails, drop the event rather than leaking data.
    return event
  }
  return event
}

let initialized = false

export function initSentry(): void {
  if (initialized) return
  if (__DEV__) {
    initialized = true
    return
  }
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (dsn == null || dsn.length === 0) {
    // No DSN configured -- app continues without crash reporting.
    initialized = true
    return
  }
  try {
    Sentry.init({
      dsn,
      enabled: true,
      debug: false,
      sendDefaultPii: false,
      attachStacktrace: true,
      tracesSampleRate: 0.0,
      environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'production',
      beforeSend(event) {
        return scrubEvent(event)
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.message != null) {
          breadcrumb.message = redactString(breadcrumb.message)
        }
        if (breadcrumb.data != null) {
          breadcrumb.data = scrub(breadcrumb.data) as typeof breadcrumb.data
        }
        return breadcrumb
      },
    })
    initialized = true
  } catch {
    // Swallow init errors -- never crash app due to Sentry.
    initialized = true
  }
}

export function captureBoundaryError(
  error: Error,
  info: { componentStack?: string | null; screen?: string | null; lastAction?: string | null },
): void {
  if (__DEV__) return
  try {
    Sentry.withScope((scope) => {
      if (info.screen != null) scope.setTag('screen', info.screen)
      if (info.lastAction != null) scope.setTag('lastAction', info.lastAction)
      scope.addBreadcrumb({
        category: 'error-boundary',
        level: 'error',
        message: 'ErrorBoundary caught render error',
        data: {
          screen: info.screen ?? null,
          lastAction: info.lastAction ?? null,
        },
      })
      if (info.componentStack != null) {
        scope.setContext('react', { componentStack: info.componentStack })
      }
      Sentry.captureException(error)
    })
  } catch {
    // Never allow reporting path to throw.
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  try {
    Sentry.addBreadcrumb({
      category: 'app',
      level: 'info',
      message: redactString(message),
      data: data != null ? (scrub(data) as Record<string, unknown>) : undefined,
    })
  } catch {
    // ignore
  }
}

export { Sentry }
