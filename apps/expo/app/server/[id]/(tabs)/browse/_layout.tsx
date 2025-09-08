import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function Layout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Browse',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: 'regular',
					headerLargeTitle: true,
					headerLargeTitleStyle: {
						fontSize: 30,
					},
				}}
			/>
		</Stack>
	)
}
