import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

export default function Layout() {
	const { translate } = useTranslate()

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: translate('shared.readingStats.title'),
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					headerLargeTitle: true,
					headerLargeTitleStyle: { fontSize: 30 },
				}}
			/>
		</Stack>
	)
}
