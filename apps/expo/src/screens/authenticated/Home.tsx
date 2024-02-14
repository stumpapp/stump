import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

import CenterTabSelector from '@/components/CenterTabSelector'

export default function Home() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am home</Text>
			<CenterTabSelector />
			<StatusBar style="auto" />
		</View>
	)
}
