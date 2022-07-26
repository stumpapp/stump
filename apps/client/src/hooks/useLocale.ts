import '~i18n/config';
import { useTranslation } from 'react-i18next';
import { Locale } from '~util/enums';
import { useUser } from './useUser';

// FIXME: When a user logs out, their locale should be persisted. Right now,
// user.preferences doesn't exist in a logged out state. I think what I should maybe do
// instead of clearing it on logout is set an auth state to false or something? this way,
// preferences remain (mainly for locale) and shows correct language on login.
// Alternatively, I can be lazy and just persist a separate locale state. ~shrug~
export function useLocale() {
	const { preferences, updatePreferences } = useUser();

	function setLocaleFromStr(localeStr: string) {
		let locale = localeStr as Locale;

		if (preferences && locale) {
			updatePreferences({ ...preferences, locale });
		}
	}

	function setLocale(locale: Locale) {
		if (preferences && locale) {
			updatePreferences({ ...preferences, locale });
		}
	}

	const locale: string = preferences?.locale || 'en';

	const { t } = useTranslation(locale);

	const locales = Object.keys(Locale)
		.map((key) => ({ label: key, value: Locale[key as keyof typeof Locale] }))
		.filter((option) => typeof option.value === 'string');

	return { locale, setLocale, setLocaleFromStr, t, locales };
}
