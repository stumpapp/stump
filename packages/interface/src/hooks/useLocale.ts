import '../i18n/config'

import { useUserStore } from '@stump/client'
import { useTranslation } from 'react-i18next'

export enum Locale {
	English = 'en',
	French = 'fr',
}

export type LocaleSelectOption = {
	label: string
	value: Locale
}

export function useLocale() {
	// TODO: update DB on changes
	const { userPreferences, setUserPreferences } = useUserStore()

	function setLocaleFromStr(localeStr: string) {
		const locale = localeStr as Locale

		if (userPreferences && locale) {
			setUserPreferences({ ...userPreferences, locale })
		}
	}

	function setLocale(locale: Locale) {
		if (userPreferences && locale) {
			setUserPreferences({ ...userPreferences, locale })
		}
	}

	const locale: string = userPreferences?.locale || 'en'

	const { t } = useTranslation(locale)

	const locales: LocaleSelectOption[] = Object.keys(Locale)
		.map((key) => ({ label: key, value: Locale[key as keyof typeof Locale] }))
		.filter((option) => typeof option.value === 'string')

	return { locale, locales, setLocale, setLocaleFromStr, t }
}
