import '@/i18n/config'

import { useTranslation } from 'react-i18next'

import { useUserStore } from '@/stores'

export enum Locale {
	English = 'en',
	French = 'fr',
	Spanish = 'es',
}

export type LocaleSelectOption = {
	label: string
	value: Locale
}

// TODO: remove in favor of useLocaleContext
export function useLocale() {
	// TODO: update DB on changes
	const { userPreferences, setUserPreferences } = useUserStore((store) => ({
		setUserPreferences: store.setUserPreferences,
		userPreferences: store.userPreferences,
	}))

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
