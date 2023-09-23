import { AllowedLocale } from './config'

export { LocaleContext, type LocaleContextProps, useLocaleContext } from './context'
export { default as LocaleProvider } from './LocaleProvider'

export const localeNames: Record<AllowedLocale, string> = {
	af: 'Afrikaans',
	ar: 'العربية',
	ca: 'Català',
	cs: 'Čeština',
	da: 'Dansk',
	de: 'Deutsch',
	el: 'Ελληνικά',
	en: 'English',
	es: 'Español',
	fi: 'Suomi',
	fr: 'Français',
	he: 'עברית',
	hu: 'Hungarian',
	it: 'Italiano',
	ja: '日本語',
	ko: '한국어',
	nl: 'Nederlands',
	no: 'Norsk',
	pl: 'Polski',
	pt: 'Português',
	ro: 'Română',
	ru: 'Русский',
	sr: 'Srpski',
	sv: 'Svenska',
	tr: 'Türkçe',
	uk: 'Українська',
	vi: 'Tiếng Việt',
	zh: '中文',
}

export function isLocale(value: string): value is AllowedLocale {
	return Object.keys(localeNames).includes(value)
}
