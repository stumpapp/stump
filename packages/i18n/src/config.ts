import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
	afZA,
	arSA,
	caES,
	csCZ,
	daDK,
	deDE,
	elGR,
	enGB,
	enUS,
	esES,
	fiFI,
	frFR,
	heIL,
	huHU,
	itIT,
	jaJP,
	koKR,
	nlNL,
	noNO,
	plPL,
	ptBR,
	ptPT,
	roRO,
	ruRU,
	srSP,
	svSE,
	trTR,
	ukUA,
	viVN,
	zhCN,
	zhTW,
} from './locales'

export const resources = {
	'af-ZA': {
		'af-ZA': afZA,
	},
	'ar-SA': {
		'ar-SA': arSA,
	},
	'ca-ES': {
		'ca-ES': caES,
	},
	'cs-CZ': {
		'cs-CZ': csCZ,
	},
	'da-DK': {
		'da-DK': daDK,
	},
	'de-DE': {
		'de-DE': deDE,
	},
	'el-GR': {
		'el-GR': elGR,
	},
	'en-GB': {
		'en-GB': enGB,
	},
	'en-US': {
		'en-US': enUS,
	},
	'es-ES': {
		'es-ES': esES,
	},
	'fi-FI': {
		'fi-FI': fiFI,
	},
	'fr-FR': {
		'fr-FR': frFR,
	},
	'he-IL': {
		'he-IL': heIL,
	},
	'hu-HU': {
		'hu-HU': huHU,
	},
	'it-IT': {
		'it-IT': itIT,
	},
	'ja-JP': {
		'ja-JP': jaJP,
	},
	'ko-KR': {
		'ko-KR': koKR,
	},
	'nl-NL': {
		'nl-NL': nlNL,
	},
	'no-NO': {
		'no-NO': noNO,
	},
	'pl-PL': {
		'pl-PL': plPL,
	},
	'pt-BR': {
		'pt-BR': ptBR,
	},
	'pt-PT': {
		'pt-PT': ptPT,
	},
	'ro-RO': {
		'ro-RO': roRO,
	},
	'ru-RU': {
		'ru-RU': ruRU,
	},
	'sr-SP': {
		'sr-SP': srSP,
	},
	'sv-SE': {
		'sv-SE': svSE,
	},
	'tr-TR': {
		'tr-TR': trTR,
	},
	'uk-UA': {
		'uk-UA': ukUA,
	},
	'vi-VN': {
		'vi-VN': viVN,
	},
	'zh-CN': {
		'zh-CN': zhCN,
	},
	'zh-TW': {
		'zh-TW': zhTW,
	},
} as const
export type AllowedLocale = keyof typeof resources
export type Translation = (typeof resources)['en-US']['en-US']

function parseMissingKeyHandler(missingKey: string) {
	try {
		const translation = (missingKey ?? '')
			.split('.')
			.filter(Boolean)
			// @ts-expect-error: This is a complicated type, but we know it will work
			.reduce((previous, current) => previous?.[current], resources['en-US']['en-US'])

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
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	parseMissingKeyHandler,
	resources,
})

export { i18n }
