import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function Layout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: 'Search',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: 'regular',
				}}
			/>

			<Stack.Screen
				name="[query]"
				options={{
					headerShown: false,
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: 'regular',
				}}
			/>
		</Stack>
	)
}
