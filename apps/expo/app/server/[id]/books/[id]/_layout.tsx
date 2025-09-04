import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function Screen() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerTitle: '',
					headerShown: Platform.OS === 'ios',
					headerTransparent: true,
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					headerLargeTitle: true,
					headerBlurEffect: 'regular',
				}}
			/>
		</Stack>
	)
}
