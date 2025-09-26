import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { ENABLE_LARGE_HEADER } from '~/lib/constants'

import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ headerShown: false, animation: animationEnabled ? 'default' : 'none' }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					headerLargeTitle: ENABLE_LARGE_HEADER,
					headerBlurEffect: 'regular',
					animation: animationEnabled ? 'default' : 'none',
				}}
			/>
		</Stack>
	)
}
