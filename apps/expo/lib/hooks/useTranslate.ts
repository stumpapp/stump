import { useLocaleContext } from '@stump/i18n'

export function useTranslate() {
	const { t } = useLocaleContext()
	return {
		t: (key: string) => t(`mobileApp.${key}`),
	}
}
