import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { AddServerDialog } from '~/components/savedServer'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { t } = useTranslate()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	// TODO(android): this looks shit on android, idky the header is so short
	return (
		<Stack
			screenOptions={{
				title: t('tabs.servers'),
				headerShown: true,
				headerTransparent: Platform.OS === 'ios',
				headerLargeTitle: true,
				headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
				animation: animationEnabled ? 'default' : 'none',
				headerRight: () => <AddServerDialog />,
			}}
		/>
	)
}
