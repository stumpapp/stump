import { useCreateTranslate } from '@stump/i18n'

import { useLocalPreferencesStore } from '@/stores/user'

export function useTranslate() {
	const textCase = useLocalPreferencesStore((store) => store.textCase)
	return useCreateTranslate({
		namespace: 'webApp',
		displayLanguageKeys: 'none',
		textCase,
	})
}
