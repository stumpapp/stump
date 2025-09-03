import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					headerLargeTitle: true,
					headerBlurEffect: 'regular',
					animation: animationEnabled ? 'default' : 'none',
				}}
			/>

			<Stack.Screen
				name="[id]"
				options={{
					headerShown: true,
					headerTitle: '',
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					// headerLargeTitle: true,
					headerBlurEffect: 'regular',
					animation: animationEnabled ? 'default' : 'none',
				}}
			/>
		</Stack>
	)
}
