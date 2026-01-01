import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const disableDismissGesture = usePreferencesStore((store) => store.disableDismissGesture)

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				presentation:
					disableDismissGesture && Platform.OS === 'ios' ? 'fullScreenModal' : undefined,
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
					presentation: 'formSheet',
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="ebook-locations-modal"
				options={{
					presentation: 'formSheet',
					headerShown: false,
				}}
			/>
		</Stack>
	)
}
