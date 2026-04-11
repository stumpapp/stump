import { type AllowedLocale, initDateFnsLocale, isLocale, localeNames } from '@stump/i18n'
import * as Localization from 'expo-localization'
import { Languages } from 'lucide-react-native'
import { useMemo } from 'react'
import { Platform } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Picker } from '~/components/ui/picker/picker'
import { PickerOption } from '~/components/ui/picker/types'
import { PickerSheet } from '~/components/ui/picker-sheet'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

const localeOptions: PickerOption<AllowedLocale>[] = Object.entries(localeNames).map(
	([value, label]) => ({
		label,
		value: value as AllowedLocale,
	}),
)

export default function AppLanguage() {
	const { t } = useTranslate()
	const { locale, patch } = usePreferencesStore(
		useShallow((state) => ({
			locale: state.locale,
			patch: state.patch,
		})),
	)

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
		<AppSettingsRow
			icon={Languages}
			iconBackgroundColor={SETTINGS_COLORS.interactive}
			title={t('settings.preferences.appLanguage')}
		>
			{Platform.select({
				ios: (
					<Picker<AllowedLocale>
						value={currentLocale}
						options={localeOptions}
						onValueChange={handleChange}
					/>
				),
				android: (
					<PickerSheet<AllowedLocale>
						value={currentLocale}
						options={localeOptions}
						onValueChange={handleChange}
					/>
				),
			})}
		</AppSettingsRow>
	)
}
