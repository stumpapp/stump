import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

export default function ServerNotAccessible() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am logging in (or claiming server)</Text>
			<StatusBar style="auto" />
		</View>
	)
}
