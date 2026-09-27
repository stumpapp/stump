import { Stack } from 'expo-router'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'

// TODO: prob query for thumb color here and use provider? so each screen more immediately
// has the value needed for bg? we'll see if issue

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
					headerTitle: 'Reading Timeline',
					headerShown: true,
					headerTransparent: true,
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					headerLeft: () => <BackLink />,
				}}
			/>

			<Stack.Screen
				name="[sessionId]"
				options={{
					headerTitle: '',
					headerShown: true,
					headerTransparent: true,
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					// headerLeft: () => <BackLink />,
				}}
			/>
		</Stack>
	)
}
