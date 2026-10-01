import { Stack } from 'expo-router'
import { View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import { IS_IOS_26_PLUS, usePalette } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const accentColor = usePalette('accent')
	const listColors = usePreferencesStore((store) => store.tintListBackground)

	// TODO(reading-timeline): technically the book timeline doesn't consider tintListBackground, but it
	// probably should so did it here
	return (
		<View style={{ flex: 1 }}>
			{listColors && (
				<ScreenBackgroundGradient
					item={{
						thumbnail: {
							metadata: {
								averageColor: accentColor,
							},
						},
					}}
				/>
			)}

			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: {
						backgroundColor: 'transparent',
					},
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						headerTitle: 'Reading Timeline',
						headerShown: true,
						headerTransparent: true,
						headerLargeTitleEnabled: true,
						headerLargeTitleStyle: { fontSize: 30 },
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					}}
				/>

				{/*<Stack.Screen
					name="[sessionId]"
					options={{
						headerTitle: '',
						headerShown: true,
						headerTransparent: true,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					}}
				/>*/}
			</Stack>
		</View>
	)
}
