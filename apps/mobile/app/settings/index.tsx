import { Stack } from 'expo-router'
import { Text, View } from 'react-native'

export default function Settings() {
	return (
		<>
			<Stack.Screen options={{ title: 'Settings' }} />
			<View className={'flex-1 items-center justify-center'}>
				<Text>Settings are going to be here at some point</Text>
			</View>
		</>
	)
}
