import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'

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
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLeft: () => <ChevronBackLink />,
				}}
			/>

			<Stack.Screen
				name="ebook-settings"
				options={{
					presentation: 'modal',
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="ebook-locations-modal"
				options={{
					presentation: 'modal',
					headerShown: false,
				}}
			/>
		</Stack>
	)
}
