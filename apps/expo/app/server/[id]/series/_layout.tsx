import { Stack } from 'expo-router'
import { useRef } from 'react'
import { Platform } from 'react-native'

import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'
import { createSeriesFilterStore, SeriesFilterContext } from '~/stores/filters'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	// eslint-disable-next-line react-hooks/refs
	const seriesListStore = useRef(createSeriesFilterStore()).current

	// i had to wrap the entire stack because wrapping an individual stack seemed to cause issues,
	// and i needed it for the header buttons etc
	return (
		<SeriesFilterContext.Provider value={seriesListStore}>
			<Stack
				screenOptions={{
					headerShown: false,
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						headerTitle: 'Series',
						headerShown: true,
						headerTransparent: Platform.OS === 'ios',
						headerLargeTitleStyle: {
							fontSize: 30,
						},
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						animation: animationEnabled ? 'default' : 'none',
						headerLeft: Platform.OS === 'android' ? undefined : () => <BackLink />,
					}}
				/>

				<Stack.Screen
					name="[id]"
					options={{
						headerShown: true,
						headerTitle: '',
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						animation: animationEnabled ? 'default' : 'none',
					}}
				/>
			</Stack>
		</SeriesFilterContext.Provider>
	)
}
