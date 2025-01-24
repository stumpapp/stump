import upperFirst from 'lodash/upperFirst'
import { ChevronRight } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'

import AppSettingsRow from '../AppSettingsRow'

export default function AppTheme() {
	const { colorScheme } = useColorScheme()

	return (
		<AppSettingsRow icon="Paintbrush" title="Theme">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">{upperFirst(colorScheme)}</Text>
				<ChevronRight size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
