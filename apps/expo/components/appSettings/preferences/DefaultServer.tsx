import { ChevronRight } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

export default function DefaultServer() {
	return (
		<AppSettingsRow icon="Database" title="Default server">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">Localhost</Text>
				<ChevronRight size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
