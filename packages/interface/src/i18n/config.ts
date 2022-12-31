/* eslint-disable @typescript-eslint/ban-ts-comment */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// @ts-ignore: ugh, stinky tsconfig i'll deal with this later
import en from './locales/en.json'
// @ts-ignore: ugh, stinky tsconfig i'll deal with this later
import fr from './locales/fr.json'

// NOTE: the fr locale is *NOT* complete or acurrate. Used for testing...
// TODO: once the english locale is completed/mostly completed, the structure
// will be available to start adding other languages. Stump is currently too young
// to add more locales now, while I don't expect too many large scale UI changes
// at this point it would be a big pain to add locales only to have to redo them later
// on.
export const resources = {
	en: {
		en,
	},
	fr: {
		fr,
	},
} as const

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
