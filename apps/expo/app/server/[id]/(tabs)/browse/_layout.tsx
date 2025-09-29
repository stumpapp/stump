import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'

export default function Layout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Browse',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLargeTitle: true,
					headerLargeTitleStyle: {
						fontSize: 30,
					},
				}}
			/>
		</Stack>
	)
}
