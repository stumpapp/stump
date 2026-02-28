import type { Locale } from 'date-fns'
import { formatDuration, setDefaultOptions } from 'date-fns'

import type { AllowedLocale } from './config'

// Note: lazy loading as to not bloat initial bundle with all the locales
const dateFnsLocaleLoaders: Record<AllowedLocale, () => Promise<Locale>> = {
	'af-ZA': () => import('date-fns/locale/af').then((m) => m.af),
	'ar-SA': () => import('date-fns/locale/ar-SA').then((m) => m.arSA),
	'ca-ES': () => import('date-fns/locale/ca').then((m) => m.ca),
	'cs-CZ': () => import('date-fns/locale/cs').then((m) => m.cs),
	'da-DK': () => import('date-fns/locale/da').then((m) => m.da),
	'de-DE': () => import('date-fns/locale/de').then((m) => m.de),
	'el-GR': () => import('date-fns/locale/el').then((m) => m.el),
	'en-GB': () => import('date-fns/locale/en-GB').then((m) => m.enGB),
	'en-US': () => import('date-fns/locale/en-US').then((m) => m.enUS),
	'es-ES': () => import('date-fns/locale/es').then((m) => m.es),
	'fi-FI': () => import('date-fns/locale/fi').then((m) => m.fi),
	'fr-FR': () => import('date-fns/locale/fr').then((m) => m.fr),
	'he-IL': () => import('date-fns/locale/he').then((m) => m.he),
	'hu-HU': () => import('date-fns/locale/hu').then((m) => m.hu),
	'it-IT': () => import('date-fns/locale/it').then((m) => m.it),
	'ja-JP': () => import('date-fns/locale/ja').then((m) => m.ja),
	'ko-KR': () => import('date-fns/locale/ko').then((m) => m.ko),
	'nl-NL': () => import('date-fns/locale/nl').then((m) => m.nl),
	'no-NO': () => import('date-fns/locale/nb').then((m) => m.nb), // Norwegian Bokmål
	'pl-PL': () => import('date-fns/locale/pl').then((m) => m.pl),
	'pt-BR': () => import('date-fns/locale/pt-BR').then((m) => m.ptBR),
	'pt-PT': () => import('date-fns/locale/pt').then((m) => m.pt),
	'ro-RO': () => import('date-fns/locale/ro').then((m) => m.ro),
	'ru-RU': () => import('date-fns/locale/ru').then((m) => m.ru),
	'sr-SP': () => import('date-fns/locale/sr').then((m) => m.sr),
	'sv-SE': () => import('date-fns/locale/sv').then((m) => m.sv),
	'tr-TR': () => import('date-fns/locale/tr').then((m) => m.tr),
	'uk-UA': () => import('date-fns/locale/uk').then((m) => m.uk),
	'vi-VN': () => import('date-fns/locale/vi').then((m) => m.vi),
	'zh-CN': () => import('date-fns/locale/zh-CN').then((m) => m.zhCN),
	'zh-TW': () => import('date-fns/locale/zh-TW').then((m) => m.zhTW),
}

const localeCache = new Map<AllowedLocale, Locale>()

function isAllowedLocale(locale: string): locale is AllowedLocale {
	return locale in dateFnsLocaleLoaders
}

function findClosestLocale(locale: string): AllowedLocale {
	const normalized = locale.replace('_', '-')

	if (isAllowedLocale(normalized)) {
		return normalized
	}

	const language = normalized.split('-')[0]?.toLowerCase() || 'en'

	const languageFallbacks: Record<string, AllowedLocale> = {
		af: 'af-ZA',
		ar: 'ar-SA',
		ca: 'ca-ES',
		cs: 'cs-CZ',
		da: 'da-DK',
		de: 'de-DE',
		el: 'el-GR',
		en: 'en-US',
		es: 'es-ES',
		fi: 'fi-FI',
		fr: 'fr-FR',
		he: 'he-IL',
		hu: 'hu-HU',
		it: 'it-IT',
		ja: 'ja-JP',
		ko: 'ko-KR',
		nl: 'nl-NL',
		no: 'no-NO',
		nb: 'no-NO',
		nn: 'no-NO',
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

	if (language in languageFallbacks) {
		return languageFallbacks[language as keyof typeof languageFallbacks] as AllowedLocale
	}

	return 'en-US'
}

export async function initDateFnsLocale(locale: string): Promise<AllowedLocale> {
	const targetLocale = findClosestLocale(locale)

	let dateFnsLocale = localeCache.get(targetLocale)

	if (!dateFnsLocale) {
		try {
			dateFnsLocale = await dateFnsLocaleLoaders[targetLocale]()
			localeCache.set(targetLocale, dateFnsLocale)
		} catch (error) {
			console.warn(
				`Failed to load date-fns locale for ${targetLocale}, falling back to en-US`,
				error,
			)

			if (targetLocale !== 'en-US') {
				dateFnsLocale = localeCache.get('en-US')
				if (!dateFnsLocale) {
					dateFnsLocale = await dateFnsLocaleLoaders['en-US']()
					localeCache.set('en-US', dateFnsLocale)
				}
			} else {
				throw error // Re-throw if en-US itself failed
			}
		}
	}

	setDefaultOptions({ locale: dateFnsLocale })

	return targetLocale
}

/**
 * Format elapsed time (HH:MM:SS) for job timers and similar use cases
 */
export function formatElapsedDuration(seconds: number): string {
	const totalSeconds = Math.floor(seconds)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const secs = totalSeconds % 60

	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

type DurationUnit = 'hours' | 'minutes' | 'seconds'

/**
 * Format a duration in human-readable form
 */
export function formatHumanDuration(
	seconds: number,
	options?: {
		significantUnits?: 1 | 2 | 3
		delimiter?: string
	},
): string {
	if (seconds <= 0) {
		return formatDuration({ seconds: 0 }, { format: ['seconds'] })
	}

	const h = Math.trunc(seconds / 3600)
	const m = Math.trunc((seconds % 3600) / 60)
	const s = Math.trunc(seconds % 60)

	let units: DurationUnit[] = ['seconds']

	if (h !== 0) {
		units = ['hours', 'minutes', 'seconds']
	} else if (m !== 0) {
		units = ['minutes', 'seconds']
	}

	return formatDuration(
		{ hours: h, minutes: m, seconds: s },
		{
			format: units.slice(0, options?.significantUnits ?? 2),
			delimiter: options?.delimiter,
		},
	)
}
