import { useCreateTranslate } from '@stump/i18n'

export function useTranslate() {
	// TODO: support preferences for two prefs in params
	return useCreateTranslate({
		namespace: 'webApp',
		displayLanguageKeys: 'none',
		textCase: 'sentenceCase',
	})
}
