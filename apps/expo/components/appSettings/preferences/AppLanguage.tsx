import { View } from 'react-native'

import { icons, Text } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

const { ChevronRight } = icons

export default function AppLanguage() {
	return (
		<AppSettingsRow icon="Languages" title="Language">
			<View className="flex flex-row items-center gap-2">
				<Text className="text-foreground-muted">English</Text>
				<ChevronRight size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
