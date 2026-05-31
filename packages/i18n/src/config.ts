import i18n, { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

import enUS from './locales/en-US.json'
import { LOCALES, type AllowedLocale } from './locales'

export { LOCALES } from './locales'
export type { AllowedLocale } from './locales'

export const resources: Resource = {
	'en-US': {
		'en-US': enUS,
	},
}

export type Translation = typeof enUS

const localeLoaders: Record<string, () => Promise<{ default: Translation }>> = {
	'af-ZA': () => import('./locales/af-ZA.json'),
	'ar-SA': () => import('./locales/ar-SA.json'),
	'ca-ES': () => import('./locales/ca-ES.json'),
	'cs-CZ': () => import('./locales/cs-CZ.json'),
	'da-DK': () => import('./locales/da-DK.json'),
	'de-DE': () => import('./locales/de-DE.json'),
	'el-GR': () => import('./locales/el-GR.json'),
	'en-GB': () => import('./locales/en-GB.json'),
	'es-ES': () => import('./locales/es-ES.json'),
	'fa-IR': () => import('./locales/fa-IR.json'),
	'fi-FI': () => import('./locales/fi-FI.json'),
	'fr-FR': () => import('./locales/fr-FR.json'),
	'he-IL': () => import('./locales/he-IL.json'),
	'hu-HU': () => import('./locales/hu-HU.json'),
	'it-IT': () => import('./locales/it-IT.json'),
	'ja-JP': () => import('./locales/ja-JP.json'),
	'ko-KR': () => import('./locales/ko-KR.json'),
	'nl-NL': () => import('./locales/nl-NL.json'),
	'no-NO': () => import('./locales/no-NO.json'),
	'pl-PL': () => import('./locales/pl-PL.json'),
	'pt-BR': () => import('./locales/pt-BR.json'),
	'pt-PT': () => import('./locales/pt-PT.json'),
	'ro-RO': () => import('./locales/ro-RO.json'),
	'ru-RU': () => import('./locales/ru-RU.json'),
	'sr-SP': () => import('./locales/sr-SP.json'),
	'sv-SE': () => import('./locales/sv-SE.json'),
	'tr-TR': () => import('./locales/tr-TR.json'),
	'uk-UA': () => import('./locales/uk-UA.json'),
	'vi-VN': () => import('./locales/vi-VN.json'),
	'zh-CN': () => import('./locales/zh-CN.json'),
	'zh-TW': () => import('./locales/zh-TW.json'),
}

function parseMissingKeyHandler(missingKey: string) {
	try {
		const translation = (missingKey ?? '')
			.split('.')
			.filter(Boolean)
			// @ts-expect-error: This is a complicated type, but we know it will work
			.reduce((previous, current) => previous?.[current], resources['en-US']?.['en-US'] || enUS)

		if (typeof translation === 'string') {
			return translation
		}

		return missingKey
	} catch (error) {
		console.error('Failed to parse missing key', error)
		return missingKey
	}
}

i18n.use(initReactI18next).init({
	fallbackLng: 'en-US',
	fallbackNS: 'en-US',
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	parseMissingKeyHandler,
	resources,
})

const LANGUAGE_CODE_MAPPINGS: Record<string, AllowedLocale> = {
	af: 'af-ZA',
	ar: 'ar-SA',
	ca: 'ca-ES',
	cs: 'cs-CZ',
	da: 'da-DK',
	de: 'de-DE',
	el: 'el-GR',
	en: 'en-US',
	es: 'es-ES',
	fa: 'fa-IR',
	fi: 'fi-FI',
	fr: 'fr-FR',
	he: 'he-IL',
	hu: 'hu-HU',
	it: 'it-IT',
	ja: 'ja-JP',
	ko: 'ko-KR',
	nl: 'nl-NL',
	no: 'no-NO',
	pl: 'pl-PL',
	pt: 'pt-BR',
	ro: 'ro-RO',
	ru: 'ru-RU',
	sr: 'sr-SP',
	sv: 'sv-SE',
	tr: 'tr-TR',
	uk: 'uk-UA',
	vi: 'vi-VN',
	zh: 'zh-CN',
}

export const resolveLocale = (inputLocale?: string): AllowedLocale => {
	const fallback: AllowedLocale = 'en-US'
	if (!inputLocale) {
		return fallback
	}

	const normalized = inputLocale.replace('_', '-')
	const matchedLocale = LOCALES.find(
		(locale) => locale.toLowerCase() === normalized.toLowerCase(),
	)
	if (matchedLocale) {
		return matchedLocale
	}

	const languageCode = normalized.split('-')[0]?.toLowerCase()
	if (languageCode && languageCode in LANGUAGE_CODE_MAPPINGS) {
		return LANGUAGE_CODE_MAPPINGS[languageCode]!
	}

	return fallback
}

export const loadLocaleResources = async (locale: AllowedLocale) => {
	if (locale === 'en-US') {
		return
	}

	if (i18n.hasResourceBundle(locale, locale)) {
		return
	}

	try {
		const loadLocale = localeLoaders[locale]
		if (!loadLocale) {
			throw new Error(`Locale loader is missing for ${locale}`)
		}

		const { default: translations } = await loadLocale()
		i18n.addResourceBundle(locale, locale, translations)
	} catch (error) {
		console.error(`Failed to load locale: ${locale}`, error)
	}
}

export { i18n }
