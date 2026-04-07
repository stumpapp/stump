import { useLocaleContext } from '@stump/i18n'

import { usePreferencesStore } from '~/stores'

export function useTranslate() {
	const { t } = useLocaleContext()
	const displayLanguageKeys = usePreferencesStore((store) => store.displayLanguageKeys)

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

	return { t: (key: string) => t(`mobileApp.${key}`) }
}
