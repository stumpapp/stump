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

const localeLoaders = import.meta.glob<{ default: Translation }>([
	'./locales/*.json',
	'!./locales/en-US.json',
])

export type Translation = typeof enUS

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

export const resolveLocale = (inputLocale?: string): AllowedLocale => {
	const fallback: AllowedLocale = 'en-US'
	if (!inputLocale) {
		return fallback
	}

	if ((LOCALES as readonly string[]).includes(inputLocale)) {
		return inputLocale as AllowedLocale
	}

	const normalizedInput = inputLocale.replace('_', '-').toLowerCase()
	const exactMatch = LOCALES.find((locale) => locale.toLowerCase() === normalizedInput)
	if (exactMatch) {
		return exactMatch
	}

	const languageCode = normalizedInput.split('-')[0]
	if (!languageCode) {
		return fallback
	}

	if (languageCode === 'en') {
		return 'en-US'
	}

	const languageMatch = LOCALES.find((locale) =>
		locale.toLowerCase().startsWith(`${languageCode}-`),
	)
	return languageMatch ?? fallback
}

export const loadLocaleResources = async (locale: AllowedLocale) => {
	if (locale === 'en-US') {
		return
	}

	if (i18n.hasResourceBundle(locale, locale)) {
		return
	}

	try {
		const loadLocale = localeLoaders[`./locales/${locale}.json`]
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
