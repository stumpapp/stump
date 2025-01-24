import { Switch } from 'react-native'

import { Text, View } from '@/components'
import { usePreferencesStore } from '@/stores'

export default function TabNameToggle() {
	const { setShowTabNames, showTabNames } = usePreferencesStore((state) => ({
		setShowTabNames: state.setShowTabNames,
		showTabNames: state.show_tab_names,
	}))

	return (
		<View className="p-4">
			<View className="w-full flex-row items-center justify-between">
				<Text>Show tab names</Text>
				<Switch onValueChange={() => setShowTabNames(!showTabNames)} value={showTabNames} />
			</View>
			<View className="flex w-full text-left">
				<Text muted size="sm">
					Toggles names underneath tab icons
				</Text>
			</View>
		</View>
	)
}
