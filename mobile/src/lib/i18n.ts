/**
 * i18n setup for the Huly mobile app.
 *
 * Uses react-i18next with:
 * - English bundled as the default resource (guaranteed fallback, never lazy).
 * - Additional locales loaded lazily via loadLocale().
 * - Missing-key logging in dev mode; silent fall-through to English in prod.
 *
 * Progressive adoption: screens may call useTranslation() incrementally.
 * Any unresolved key returns the English fallback string (via fallbackLng)
 * and, in development, logs a warning to the console.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '../../assets/locales/en.json'

export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Lazily load a non-default locale resource bundle.
 *
 * English is always bundled; additional locales are resolved dynamically so
 * they do not inflate the default JS bundle. Callers should await the returned
 * promise before switching languages with i18n.changeLanguage().
 *
 * Prefer {@link setLocale} when you want a one-liner that awaits the bundle
 * load and then flips i18next's active language.
 */
export async function loadLocale(locale: string): Promise<boolean> {
  if (locale === DEFAULT_LOCALE) {
    return true
  }
  // Additional locales can be wired here when translation files land.
  // Example pattern (intentionally commented until locale assets exist):
  // if (locale === 'fr') {
  //   const fr = await import('../../assets/locales/fr.json')
  //   i18n.addResourceBundle('fr', 'translation', fr.default ?? fr, true, true)
  //   return true
  // }
  if (__DEV__) {
    console.warn(`[i18n] loadLocale("${locale}") — locale not bundled, keeping ${DEFAULT_LOCALE}`)
  }
  return false
}

let initialized = false

export function initI18n(): typeof i18n {
  if (initialized) {
    return i18n
  }
  initialized = true

  void i18n.use(initReactI18next).init({
    // Hermes lacks Intl.PluralRules; use the legacy v3 plural format so i18next
    // does not warn on every render. Remove once Hermes ships full Intl support
    // and we explicitly switch to v4 plural rules.
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: enCommon },
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React Native escapes by default
    },
    returnNull: false,
    returnEmptyString: false,
    // Surface missing keys in development so gaps become visible during work.
    saveMissing: __DEV__,
    missingKeyHandler: (lngs, _ns, key) => {
      if (__DEV__) {
        console.warn(`[i18n] missing key "${key}" for locale ${lngs.join(',')}`)
      }
    },
    react: {
      useSuspense: false,
    },
  })

  return i18n
}

/**
 * Change the active locale, loading the bundle first if needed.
 *
 * Usage:
 * ```ts
 * await setLocale('fr')
 * ```
 *
 * Prefer this over calling `i18n.changeLanguage(...)` directly, which can
 * race with the bundle load and temporarily render English strings.
 */
export async function setLocale(locale: string): Promise<void> {
  await loadLocale(locale)
  await i18n.changeLanguage(locale)
}

export default i18n
