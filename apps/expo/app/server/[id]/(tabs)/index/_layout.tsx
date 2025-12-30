import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const {
		activeServer: { name: serverName },
	} = useActiveServer()

	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: serverName,
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
