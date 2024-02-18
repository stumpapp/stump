import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import SettingsRoot from './SettingsRoot'

const Stack = createNativeStackNavigator()

export default function Settings() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="SettingsRoot" component={SettingsRoot} options={{ headerShown: false }} />
		</Stack.Navigator>
	)
}
