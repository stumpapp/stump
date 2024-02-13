import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

const Stack = createNativeStackNavigator()

export default function Settings() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am settings</Text>
			<StatusBar style="auto" />
		</View>
	)
}
