import { Stack } from 'expo-router'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'

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
