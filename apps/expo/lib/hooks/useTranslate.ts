import { useCreateTranslate } from '@stump/i18n'

import { usePreferencesStore } from '~/stores'

export function useTranslate() {
	const displayLanguageKeys = usePreferencesStore((store) => store.displayLanguageKeys)
	const textCase = usePreferencesStore((store) => store.textCase)

	return useCreateTranslate({
		namespace: 'mobileApp',
		displayLanguageKeys,
		textCase,
	})
}
