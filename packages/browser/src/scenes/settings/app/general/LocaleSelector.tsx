import { useUpdatePreferences, useUserStore } from '@stump/client'
import { ComboBox } from '@stump/components'
import { shallow } from 'zustand/shallow'

import { isLocale, localeNames, useLocaleContext } from '@/i18n'

const options = Object.entries(localeNames).map(([value, label]) => ({
	label,
	value,
}))

export default function LocaleSelector() {
	const { t, locale } = useLocaleContext()
	const { setUserPreferences, userPreferences } = useUserStore(
		(store) => ({
			setUserPreferences: store.setUserPreferences,
			user: store.user,
			userPreferences: store.userPreferences,
		}),
		shallow,
	)
	const { update } = useUpdatePreferences({
		onSuccess: (preferences) => setUserPreferences(preferences),
	})

	const handleChange = async (selected?: string) => {
		if (selected && userPreferences && isLocale(selected || '')) {
			await update({ ...userPreferences, locale: selected })
		}
	}

	return (
		<ComboBox
			label={t('settingsScene.app/account.sections.locale.localeSelector.label')}
			value={locale}
			options={options}
			filterable
			onChange={handleChange}
		/>
	)
}
