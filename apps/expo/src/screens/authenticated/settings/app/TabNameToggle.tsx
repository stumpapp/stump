import React from 'react'
import { Switch } from 'react-native'

import { Text, View } from '@/components'
import { usePreferencesStore } from '@/stores'

export default function TabNameToggle() {
	const { setShowTabNames, showTabNames } = usePreferencesStore((state) => ({
		setShowTabNames: state.setShowTabNames,
		showTabNames: state.show_tab_names,
	}))

	return (
		<React.Fragment>
			<View className="w-full flex-row items-center justify-between px-4">
				<Text>Show tab names</Text>
				<Switch
					onValueChange={() => {
						setShowTabNames(!showTabNames)
					}}
					value={showTabNames}
				/>
			</View>
			<View className="-mt-3 flex w-[90%] items-start px-4">
				<Text muted>Toggles names underneath tab icons</Text>
			</View>
		</React.Fragment>
	)
}
