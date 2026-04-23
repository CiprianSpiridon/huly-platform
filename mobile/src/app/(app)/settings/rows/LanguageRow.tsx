/**
 * LanguageRow -- read-only locale indicator.
 *
 * Today only the English bundle exists (SUPPORTED_LOCALES = ['en']). The
 * row surfaces the active locale and a "More languages coming soon" hint
 * without navigation. When additional bundles ship
 * (SUPPORTED_LOCALES.length > 1), upgrade this file in-place to a
 * picker: no changes to SettingsRows.tsx are required because the row
 * already occupies the registry slot under the Appearance section.
 *
 * Upgrade path:
 *   1. Remove the `return <NonInteractiveRow ... />` branch.
 *   2. Render SUPPORTED_LOCALES.map(...) as a radio group.
 *   3. Persist the selection via setLocale() from '@/lib/i18n'.
 */

import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LOCALES } from '@/lib/i18n'

const LOCALE_LABELS: Record<string, string> = {
  en: 'English (en-US)',
}

export function LanguageRow(): React.ReactNode {
  const { i18n } = useTranslation()
  // Read the live active language from i18next rather than indexing
  // SUPPORTED_LOCALES[0] — once more bundles ship the first entry will
  // no longer match the user's active locale.
  const rawLanguage =
    typeof i18n.language === 'string' && i18n.language.length > 0
      ? i18n.language
      : SUPPORTED_LOCALES[0] ?? 'en'
  const activeLocale = rawLanguage.split('-')[0] ?? rawLanguage
  const label = LOCALE_LABELS[activeLocale] ?? activeLocale

  return (
    <View className="px-4 py-3" accessibilityRole="text" accessibilityLabel={`Language ${label}`}>
      <View className="flex-row items-center justify-between min-h-[44px]">
        <Text className="font-sans text-base text-content-primary flex-1">
          Language
        </Text>
        <Text className="font-sans text-sm text-content-secondary">{label}</Text>
      </View>
      <Text className="font-sans text-xs text-content-tertiary mt-0.5">
        More languages coming soon.
      </Text>
    </View>
  )
}
