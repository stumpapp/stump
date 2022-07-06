import '~i18n/config';
import { useTranslation } from 'react-i18next';
import { useStore } from '~store/store';
import shallow from 'zustand/shallow';

export function useLocale() {
	const userPreferences = useStore((state) => state.userPreferences, shallow);
	const setLocale = useStore((state) => state.setLocale);

	const locale = userPreferences?.locale || 'en';

	const { t } = useTranslation(locale);

	return { locale, setLocale, t };
}
