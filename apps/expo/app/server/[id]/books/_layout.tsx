import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: animationEnabled ? 'default' : 'none',
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Books',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLargeTitle: false,
					headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
				}}
			/>
		</Stack>
	)
}
