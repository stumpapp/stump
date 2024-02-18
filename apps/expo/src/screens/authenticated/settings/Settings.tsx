import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import { ScreenRootView, Text } from '@/components'

const Stack = createNativeStackNavigator()

export default function Settings() {
	return (
		<ScreenRootView className="flex-1 items-center justify-center">
			<Text>I am settings</Text>
		</ScreenRootView>
	)
}
