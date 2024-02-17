import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'

import { View } from '@/components'

export default function BookOverview() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am overview</Text>
			<StatusBar style="auto" />
		</View>
	)
}
