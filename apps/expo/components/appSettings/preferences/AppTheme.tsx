import { Paintbrush } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { useColorScheme } from '~/lib/useColorScheme'

import AppSettingsRow from '../AppSettingsRow'

export default function AppTheme() {
	const { colorScheme, setColorScheme } = useColorScheme()

	return (
		<AppSettingsRow icon={Paintbrush} title="Theme">
			<Picker<'light' | 'dark'>
				value={colorScheme}
				options={[
					{
						label: 'Light',
						value: 'light',
					},
					{
						label: 'Dark',
						value: 'dark',
					},
				]}
				onValueChange={setColorScheme}
			/>
		</AppSettingsRow>
	)
}
