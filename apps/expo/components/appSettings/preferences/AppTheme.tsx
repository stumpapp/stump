import { Paintbrush } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

import AppSettingsRow from '../AppSettingsRow'

export default function AppTheme() {
	const { t } = useTranslate()
	const { colorScheme, setColorScheme } = useColorScheme()

	return (
		<AppSettingsRow icon={Paintbrush} title={t(getKey('label'))}>
			<Picker<'light' | 'dark'>
				value={colorScheme}
				options={[
					{
						label: t(getKey('options.light')),
						value: 'light',
					},
					{
						label: t(getKey('options.dark')),
						value: 'dark',
					},
				]}
				onValueChange={setColorScheme}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.preferences.appTheme'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
