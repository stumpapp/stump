import { ComboBox } from '@stump/components'
import { isLocale, localeNames, useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

const options = Object.entries(localeNames).map(([value, label]) => ({
	label,
	value,
}))

export default function LocaleSelector() {
	const { t } = useLocaleContext()
	const {
		preferences: { locale },
		update,
	} = usePreferences()

	const handleChange = useCallback(
		async (selected?: string) => {
			if (isLocale(selected || '')) {
				update({ locale: selected })
			}
		},
		[update],
	)

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
