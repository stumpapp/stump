import { useColorScheme } from 'nativewind'
import React from 'react'
import { Button } from 'react-native'

import { ScreenRootView, Text } from '@/components'

export default function Home() {
	const { colorScheme, toggleColorScheme } = useColorScheme()

	return (
		<ScreenRootView>
			<Text>I am home : {colorScheme}</Text>
			<Button title="Toggle color scheme" onPress={toggleColorScheme} />
		</ScreenRootView>
	)
}
