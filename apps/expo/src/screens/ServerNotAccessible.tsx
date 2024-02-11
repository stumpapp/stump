import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

export default function ServerNotAccessible() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I cannot connect to the server</Text>
			<StatusBar style="auto" />
		</View>
	)
}
