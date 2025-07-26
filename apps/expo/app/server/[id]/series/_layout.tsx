import { Stack } from 'expo-router'

import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<Stack
			screenOptions={{ headerShown: false, animation: animationEnabled ? 'default' : 'none' }}
		/>
	)
}
