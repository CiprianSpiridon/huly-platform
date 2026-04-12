import { Redirect, type Href } from 'expo-router'

/**
 * Root (app) index -- redirects to the default tab.
 * This file exists because expo-router requires an index.tsx in route groups.
 * The Tabs layout hides this screen via href: null.
 */
export default function AppIndex(): React.ReactNode {
  return <Redirect href={'/(app)/tracker' as Href} />
}
