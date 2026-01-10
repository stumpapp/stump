import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { AddServerDialog } from '~/components/savedServer'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				title: 'Servers',
				headerShown: Platform.OS === 'ios',
				headerTransparent: Platform.OS === 'ios',
				headerLargeTitle: true,
				headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
				animation: animationEnabled ? 'default' : 'none',
				headerRight: Platform.OS === 'ios' ? () => <AddServerDialog /> : undefined,
			}}
		/>
	)
}
