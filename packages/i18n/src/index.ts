import { AllowedLocale } from './config'

export { LocaleContext, type LocaleContextProps, useLocaleContext } from './context'
export { formatElapsedDuration, formatHumanDuration, initDateFnsLocale } from './dateFnsLocale'
export { default as LocaleProvider } from './LocaleProvider'
export type { AllowedLocale }

export const localeNames: Record<AllowedLocale, string> = {
	'af-ZA': 'Afrikaans',
	'ar-SA': 'العربية',
	'ca-ES': 'Català',
	'cs-CZ': 'Čeština',
	'da-DK': 'Dansk',
	'de-DE': 'Deutsch',
	'el-GR': 'Ελληνικά',
	'en-GB': 'English (UK)',
	'en-US': 'English (US)',
	'es-ES': 'Español',
	'fi-FI': 'Suomi',
	'fr-FR': 'Français',
	'he-IL': 'עברית',
	'hu-HU': 'Hungarian',
	'it-IT': 'Italiano',
	'ja-JP': '日本語',
	'ko-KR': '한국어',
	'nl-NL': 'Nederlands',
	'no-NO': 'Norsk',
	'pl-PL': 'Polski',
	'pt-BR': 'Português (Brasil)',
	'pt-PT': 'Português (Portugal)',
	'ro-RO': 'Română',
	'ru-RU': 'Русский',
	'sr-SP': 'Srpski',
	'sv-SE': 'Svenska',
	'tr-TR': 'Türkçe',
	'uk-UA': 'Українська',
	'vi-VN': 'Tiếng Việt',
	'zh-CN': '中文 (简体)',
	'zh-TW': '中文 (繁體)',
}

export function isLocale(value: string): value is AllowedLocale {
	return Object.keys(localeNames).includes(value)
}
