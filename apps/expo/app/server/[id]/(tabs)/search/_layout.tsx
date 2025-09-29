import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_24_PLUS } from '~/lib/constants'

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
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
				}}
			/>

			<Stack.Screen
				name="[query]"
				options={{
					headerShown: false,
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
				}}
			/>
		</Stack>
	)
}
