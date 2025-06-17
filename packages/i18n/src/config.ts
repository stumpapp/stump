import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
	af,
	ar,
	ca,
	cs,
	da,
	de,
	el,
	en,
	es,
	fi,
	fr,
	he,
	hu,
	it,
	ja,
	ko,
	nl,
	no,
	pl,
	pt,
	ro,
	ru,
	sr,
	sv,
	tr,
	uk,
	vi,
	zh,
} from './locales'

// TODO: this is verbose, figure out a clean way to do this
export const resources = {
	af: {
		af,
	},
	ar: {
		ar,
	},
	ca: {
		ca,
	},
	cs: {
		cs,
	},
	da: {
		da,
	},
	de: {
		de,
	},
	el: {
		el,
	},
	en: {
		en,
	},
	es: {
		es,
	},
	fi: {
		fi,
	},
	fr: {
		fr,
	},
	he: {
		he,
	},
	hu: {
		hu,
	},
	it: {
		it,
	},
	ja: {
		ja,
	},
	ko: {
		ko,
	},
	nl: {
		nl,
	},
	no: {
		no,
	},
	pl: {
		pl,
	},
	pt: {
		pt,
	},
	ro: {
		ro,
	},
	ru: {
		ru,
	},
	sr: {
		sr,
	},
	sv: {
		sv,
	},
	tr: {
		tr,
	},
	uk: {
		uk,
	},
	vi: {
		vi,
	},
	zh: {
		zh,
	},
} as const
export type AllowedLocale = keyof typeof resources
export type Translation = (typeof resources)['en']['en']

function parseMissingKeyHandler(missingKey: string) {
	try {
		const translation = (missingKey ?? '')
			.split('.')
			.filter(Boolean)
			// @ts-expect-error: This is a complicated type, but we know it will work
			.reduce((previous, current) => previous?.[current], resources.en.en)

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
	fallbackLng: 'en',
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	parseMissingKeyHandler,
	resources,
})

export { i18n }
