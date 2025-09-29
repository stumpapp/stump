import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Home',
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
					headerLargeTitle: true,
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					animation: animationEnabled ? 'default' : 'none',
				}}
			/>
		</Stack>
	)
}
