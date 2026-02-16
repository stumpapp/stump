import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ animation: animationEnabled ? 'default' : 'none' }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: false,
					title: '',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
					headerLargeTitle: Platform.OS === 'ios',
					animation: animationEnabled ? 'default' : 'none',
					headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
				}}
			/>
			<Stack.Screen
				name="settings"
				options={{ presentation: 'modal', headerShown: true, title: 'Club Settings' }}
			/>
		</Stack>
	)
}
