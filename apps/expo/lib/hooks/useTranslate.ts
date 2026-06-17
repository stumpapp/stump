import { useLocaleContext } from '@stump/i18n'

import { usePreferencesStore } from '~/stores'

export function useTranslate() {
	const { t, locale } = useLocaleContext()
	const displayLanguageKeys = usePreferencesStore((store) => store.displayLanguageKeys)
	const textCase = usePreferencesStore((store) => store.textCase)

	let translate = (key: string, options?: Record<string, unknown>) => {
		const translation = t(`mobileApp.${key}`, {
			...(locale.startsWith('en-') && textCase === 'sentenceCase' ? { ns: 'sentenceCase' } : {}),
			...options,
		})
		if (textCase === 'lowerCase') {
			return translation.toLocaleLowerCase(locale)
		}
		return translation
	}

	if (displayLanguageKeys === 'full') {
		translate = (key: string) => key
	}

	if (displayLanguageKeys === 'abbreviated') {
		translate = (key: string) => {
			const parts = key.split('.')

			const abbreviatedKey = parts.map((part, index) => {
				if (index === parts.length - 1) {
					return part
				}
				return part.charAt(0)
			})

			return abbreviatedKey.join('.')
		}
	}

	return { t: translate, locale }
}
