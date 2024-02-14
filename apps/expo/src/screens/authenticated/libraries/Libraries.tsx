import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useLibraries } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

const Stack = createNativeStackNavigator()

export default function Libraries() {
	const { libraries, isLoading } = useLibraries()

	if (isLoading) {
		return null
	}

	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am libraries</Text>
			<Text>{JSON.stringify(libraries, null, 2)}</Text>
			<StatusBar style="auto" />
		</View>
	)
}
