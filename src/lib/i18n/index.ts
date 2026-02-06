/**
 * Superchart i18n System
 */

import zhCN from './zh-CN.json'
import enUS from './en-US.json'
import jaJP from './ja-JP.json'
import koKR from './ko-KR.json'
import deDE from './de-DE.json'
import frFR from './fr-FR.json'
import esES from './es-ES.json'
import ptBR from './pt-BR.json'
import ruRU from './ru-RU.json'
import trTR from './tr-TR.json'

type LocaleMessages = Record<string, string>

const locales: Record<string, LocaleMessages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'de-DE': deDE,
  'fr-FR': frFR,
  'es-ES': esES,
  'pt-BR': ptBR,
  'ru-RU': ruRU,
  'tr-TR': trTR,
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
