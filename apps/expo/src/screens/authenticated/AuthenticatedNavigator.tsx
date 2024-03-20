import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import { BookStackNavigator } from './book'
import MainTabNavigator from './MainTabNavigator'

const Stack = createNativeStackNavigator()

export default function AuthenticatedNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
			<Stack.Screen
				name="BookStack"
				component={BookStackNavigator}
				options={{ headerShown: false }}
			/>
		</Stack.Navigator>
	)
}
