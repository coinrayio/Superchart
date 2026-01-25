/**
 * Superchart i18n System
 */

import zhCN from './zh-CN.json'
import enUS from './en-US.json'

type LocaleMessages = Record<string, string>

const locales: Record<string, LocaleMessages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

/**
 * Load custom locale messages
 */
export function load(key: string, messages: LocaleMessages): void {
  locales[key] = messages
}

/**
 * Get translation for a key in a specific locale
 */
export default function i18n(key: string, locale: string): string {
  return locales[locale]?.[key] ?? key
}

export { i18n }
