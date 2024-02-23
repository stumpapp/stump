import { useColorScheme } from 'nativewind'
import React from 'react'
import { Switch } from 'react-native'

import { Text, View } from '@/components'

// https://www.nativewind.dev/api/use-color-scheme
export default function ColorSchemeToggle() {
	const { colorScheme, toggleColorScheme } = useColorScheme()

	return (
		<React.Fragment>
			<View className="w-full flex-row items-center justify-between px-4">
				<Text>Device theme</Text>
				<Switch onValueChange={toggleColorScheme} value={colorScheme === 'dark'} />
			</View>
			<View className="-mt-3 flex w-[90%] items-start px-4">
				<Text muted>Use either light or dark theme</Text>
			</View>
		</React.Fragment>
	)
}
