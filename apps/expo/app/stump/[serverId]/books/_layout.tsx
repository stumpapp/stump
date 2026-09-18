import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { t } = useTranslate()
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
					headerTitle: t('stumpServer.browse.books'),
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					headerLargeTitle: false,
					headerLeft: Platform.OS === 'android' ? undefined : () => <BackLink />,
				}}
			/>
		</Stack>
	)
}
