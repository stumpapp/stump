import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

export default function Home() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am home</Text>
			<StatusBar style="auto" />
		</View>
	)
}
