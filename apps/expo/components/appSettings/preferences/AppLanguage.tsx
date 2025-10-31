import { ChevronsUpDown, Languages } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

export default function AppLanguage() {
	return (
		<AppSettingsRow icon={Languages} title="Language">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">English</Text>
				<Icon as={ChevronsUpDown} className="h-5 text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
