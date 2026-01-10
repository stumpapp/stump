import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ headerShown: false, animation: animationEnabled ? 'default' : 'none' }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: 'Libraries',
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
					headerLargeTitle: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					animation: animationEnabled ? 'default' : 'none',
					headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
				}}
			/>
		</Stack>
	)
}
