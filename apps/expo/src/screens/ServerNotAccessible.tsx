import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

// TODO: This component needs to be aware:
// 1. If there is no server set, which is either first launch or the user initiates a reset
// 2. There is a server set, but the server is not accessible
//
// In either situation, a form should be presented to the user to enter the server URL.

export default function ServerNotAccessible() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I cannot connect to the server</Text>
			<StatusBar style="auto" />
		</View>
	)
}
