import { Paintbrush } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import type { ThemePreference } from '~/stores/user'

import AppSettingsRow from '../AppSettingsRow'

export default function AppTheme() {
	const { t } = useTranslate()
	const { themePreference, setColorScheme } = useColorScheme()

	return (
		<AppSettingsRow
			icon={Paintbrush}
			iconBackgroundColor={SETTINGS_COLORS.majorVisuals}
			title={t(getKey('label'))}
		>
			<Picker<ThemePreference>
				value={themePreference}
				options={[
					{
						label: t(getKey('options.light')),
						value: 'light',
					},
					{
						label: t(getKey('options.dark')),
						value: 'dark',
					},
					{
						label: t(getKey('options.system')),
						value: 'system',
					},
				]}
				onValueChange={setColorScheme}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.preferences.appTheme'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
