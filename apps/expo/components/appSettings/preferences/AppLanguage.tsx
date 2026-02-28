import { type AllowedLocale, initDateFnsLocale, isLocale, localeNames } from '@stump/i18n'
import * as Localization from 'expo-localization'
import { Languages } from 'lucide-react-native'
import { useMemo } from 'react'

import { Picker } from '~/components/ui/picker/picker'
import { PickerOption } from '~/components/ui/picker/types'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

const localeOptions: PickerOption<AllowedLocale>[] = Object.entries(localeNames).map(
	([value, label]) => ({
		label,
		value: value as AllowedLocale,
	}),
)

export default function AppLanguage() {
	const { locale, patch } = usePreferencesStore((state) => ({
		locale: state.locale,
		patch: state.patch,
	}))

	const deviceLocale = useMemo(() => {
		const tag = Localization.getLocales()[0]?.languageTag ?? 'en-US'
		return isLocale(tag) ? tag : 'en-US'
	}, [])

	const currentLocale = locale ?? deviceLocale

	const handleChange = (value: AllowedLocale) => {
		if (isLocale(value)) {
			patch({ locale: value })
			initDateFnsLocale(value)
		}
	}

	return (
		<AppSettingsRow icon={Languages} title="Language">
			<Picker<AllowedLocale>
				value={currentLocale}
				options={localeOptions}
				onValueChange={handleChange}
			/>
		</AppSettingsRow>
	)
}
