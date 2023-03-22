import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en, es, fr } from './locales'

export const resources = {
	en: {
		en,
	},
	es: {
		es,
	},
	fr: {
		fr,
	},
} as const
export type AllowedLocale = keyof typeof resources

function parseMissingKeyHandler(missingKey: string) {
	try {
		const translation = (missingKey ?? '')
			.split('.')
			// @ts-expect-error: is fine
			.reduce((previous, current) => previous[current], resources.en.en)

		if (typeof translation === 'string') {
			return translation
		}

		return missingKey
	} catch (error) {
		return missingKey
	}
}

i18n.use(initReactI18next).init({
	fallbackLng: 'en',
	// lng: 'en',
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	parseMissingKeyHandler,
	resources,
})

export { i18n }
