import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import ChevronBackLink from '~/components/ChevronBackLink'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack screenOptions={{ animation: animationEnabled ? 'default' : 'none' }}>
			<Stack.Screen
				name="[bookId]"
				options={{
					headerShown: false,
					headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
				}}
			/>
		</Stack>
	)
}
