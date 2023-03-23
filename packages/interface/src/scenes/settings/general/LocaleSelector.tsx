import { useUserPreferences, useUserStore } from '@stump/client'
import { ComboBox } from '@stump/components'

import { isLocale, localeNames, useLocaleContext } from '../../../i18n'

const options = Object.entries(localeNames).map(([value, label]) => ({
	label,
	value,
}))
// FIXME: I am doing ~something~ wrong here, I am noticing:
// 1. On change, locale isn't ~visibly~ changing (but it is)
// 2. On consecutive change, the locale visible is the previous locale
// The above will happen over and over (lagging behind by 1) until a full
// refresh is done, at which point the locale will be correct.
export default function LocaleSelector() {
	const { locale } = useLocaleContext()
	const { user, setUserPreferences, userPreferences } = useUserStore((store) => ({
		setUserPreferences: store.setUserPreferences,
		user: store.user,
		userPreferences: store.userPreferences,
	}))
	const { updateUserPreferences } = useUserPreferences(user?.id, {
		enableFetchPreferences: false,
		onUpdated: (preferences) => setUserPreferences(preferences),
	})

	const handleChange = async (selected?: string) => {
		if (selected && userPreferences && isLocale(selected || '')) {
			await updateUserPreferences({ ...userPreferences, locale: selected })
		}
	}

	return (
		<ComboBox label="Locale" value={locale} options={options} filterable onChange={handleChange} />
	)
}
