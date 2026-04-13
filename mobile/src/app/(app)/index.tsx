import { Redirect, type Href } from 'expo-router'

import { useSettingsStore } from '@/store/settings'

/**
 * Root (app) index -- redirects to onboarding or the default tab.
 *
 * First-run users who have not completed onboarding are redirected
 * to the onboarding slides. Subsequent launches skip straight to tracker.
 */
export default function AppIndex(): React.ReactNode {
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding)

  if (!hasCompletedOnboarding) {
    return <Redirect href={'/(app)/onboarding' as Href} />
  }

  return <Redirect href={'/(app)/tracker' as Href} />
}
