import { View } from 'react-native'

import { ConfigurationSection } from './configuration/ConfigurationSection'

export function ServerSettingsSheetContent() {
	// TODO: user info at top
	// TODO: simple storage info at bottom (bar showing used vs total with breakdown)
	// TODO: other sections?? eventually, with time i guess
	return (
		<View className="gap-8 flex-1">
			<ConfigurationSection />
		</View>
	)
}
