/**
 * React Error Boundary for the Huly mobile app.
 *
 * Class component (ErrorBoundary requires class-based lifecycle methods).
 * Catches render errors in its children and shows ErrorFallback.
 */

import React from 'react'

import { captureBoundaryError } from '@/lib/sentry'

import { ErrorFallback } from './ErrorFallback'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional custom fallback; defaults to ErrorFallback */
  fallback?: React.ComponentType<{ error: Error; onReset: () => void }>
  /** Called when the user resets from the fallback UI */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, errorInfo.componentStack)
    }
    // Report to Sentry with minimal, PII-scrubbed context.
    captureBoundaryError(error, {
      componentStack: errorInfo.componentStack ?? null,
      screen: null,
      lastAction: null,
    })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error !== null) {
      const FallbackComponent = this.props.fallback ?? ErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
export type { ErrorBoundaryProps }
