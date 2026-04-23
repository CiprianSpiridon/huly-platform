/**
 * Settings main screen.
 *
 * Mounts <SettingsRows />, which is the row-registry composition component.
 * Per-feature rows live in `rows/` and register themselves in
 * `SettingsRows.tsx`. No per-feature JSX should be added to this file.
 */

import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SettingsRows } from './SettingsRows'

export default function SettingsScreen(): React.ReactNode {
  return (
    <SafeAreaView className="flex-1 bg-surface-primary" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <SettingsRows />
      </ScrollView>
    </SafeAreaView>
  )
}
