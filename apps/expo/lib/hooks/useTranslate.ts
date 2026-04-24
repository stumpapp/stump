import { useLocaleContext } from '@stump/i18n'

import { usePreferencesStore } from '~/stores'

export function useTranslate() {
	const { t, locale } = useLocaleContext()
	const displayLanguageKeys = usePreferencesStore((store) => store.displayLanguageKeys)
	const lowerCase = usePreferencesStore((store) => store.lowercaseTranslation)

	if (displayLanguageKeys === 'full') {
		return { t: (key: string) => key }
	}

	if (displayLanguageKeys === 'abbreviated') {
		return {
			t: (key: string) => {
				const parts = key.split('.')

				const abbreviatedKey = parts.map((part, index) => {
					if (index === parts.length - 1) {
						return part
					}
					return part.charAt(0)
				})

				return abbreviatedKey.join('.')
			},
		}
	}

	const translate = (key: string, options?: Record<string, unknown>) => {
		const translation = t(`mobileApp.${key}`, options)
		if (lowerCase) {
			return translation.toLocaleLowerCase(locale)
		}
		return translation
	}

	return { t: translate }
}
