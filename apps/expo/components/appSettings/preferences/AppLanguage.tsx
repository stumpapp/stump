import { View } from 'react-native'

import { icons, Text } from '~/components/ui'

const { ChevronsUpDown } = icons

import AppSettingsRow from '../AppSettingsRow'

export default function AppLanguage() {
	return (
		<AppSettingsRow icon="Languages" title="Language">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">English</Text>
				<ChevronsUpDown className="h-5 text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
