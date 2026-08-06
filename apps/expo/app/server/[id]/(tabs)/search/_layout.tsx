import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

export default function Layout() {
	const { t } = useTranslate()
	return (
		<Stack
			screenOptions={{
				headerShown: true,
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					title: t('tabs.search'),
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
				}}
			/>

			<Stack.Screen
				name="[query]"
				options={{
					headerShown: false,
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
				}}
			/>
		</Stack>
	)
}
