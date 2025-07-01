import { useGraphQLMutation } from '@stump/client'
import { ComboBox } from '@stump/components'
import { graphql } from '@stump/graphql'
import { isLocale, localeNames, useLocaleContext } from '@stump/i18n'

import { useUserStore } from '@/stores'

const mutation = graphql(`
	mutation UpdateUserLocaleSelector($input: UpdateUserPreferencesInput!) {
		updateViewerPreferences(input: $input) {
			locale
		}
	}
`)

const options = Object.entries(localeNames).map(([value, label]) => ({
	label,
	value,
}))

export default function LocaleSelector() {
	const { t, locale } = useLocaleContext()
	const { setUserPreferences, userPreferences } = useUserStore((store) => ({
		setUserPreferences: store.setUserPreferences,
		user: store.user,
		userPreferences: store.userPreferences,
	}))

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateViewerPreferences: { locale } }) => {
			if (userPreferences) {
				setUserPreferences({ ...userPreferences, locale })
			}
		},
	})

	const handleChange = async (selected?: string) => {
		if (!selected || !userPreferences) return
		if (isLocale(selected || '')) {
			await mutate({
				input: {
					...userPreferences,
					locale: selected,
				},
			})
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
