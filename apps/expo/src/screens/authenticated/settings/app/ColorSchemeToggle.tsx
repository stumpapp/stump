import { useColorScheme } from 'nativewind'
import React from 'react'
import { Switch } from 'react-native'

import { Text, View } from '@/components'

// https://www.nativewind.dev/api/use-color-scheme
export default function ColorSchemeToggle() {
	const { colorScheme, toggleColorScheme } = useColorScheme()

	return (
		<View className="p-4">
			<View className="w-full flex-row items-center justify-between">
				<Text>Device theme</Text>
				<Switch onValueChange={toggleColorScheme} value={colorScheme === 'dark'} />
			</View>
			<View className="flex w-full text-left">
				<Text muted>Switch to {colorScheme === 'dark' ? 'light' : 'dark'} theme</Text>
			</View>
		</View>
	)
}
