import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

// One thing I have NO clue about is how auth will actually wind up working for
// the mobile app. Stump doesn't currently issue session tokens, just session cookies
// being sent/set. I RN handles this in a secure way out the gate, perhaps we are clear.
// However, my guess would be it doesn't?
//
// Adding tokens which can be pulled from the store for each request (:weary:)
// might be required.

export default function ServerNotAccessible() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am logging in (or claiming server)</Text>
			<StatusBar style="auto" />
		</View>
	)
}
