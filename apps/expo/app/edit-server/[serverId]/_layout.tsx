import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

// TODO: not saying im committed to this, would be good to explore how difficult it would be to emulate
// with truesheet (gut says difficult lol animations and all that). but if going this route, i think
// we'd do something like the following:
// - load server, setup callbacks needed or whatever
// - init form here and shove into provider
// - wire up mostly the same

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{
				title: 'Edit Server',
				headerShown: true,
				headerTransparent: Platform.OS === 'ios',
				headerLargeTitle: false,
				headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
				animation: animationEnabled ? 'default' : 'none',
				headerLeft: () => <BackLink />,
			}}
		/>
	)
}
