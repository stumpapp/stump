import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const { t } = useTranslate()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				animation: animationEnabled ? 'default' : 'none',
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: t('opds.feeds'),
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					headerLargeTitle: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
				}}
			/>

			<Stack.Screen
				name="[url]"
				options={{
					title: '',
					headerShown: true,
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
				}}
			/>
		</Stack>
	)
}
