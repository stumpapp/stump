import { Stack } from 'expo-router'
import { View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useDerivedColorPalette } from '~/providers/DerivedColorPalette'

export default function Screen() {
	const { imageMetadata } = useDerivedColorPalette()

	return (
		<View style={{ flex: 1 }}>
			<ScreenBackgroundGradient
				item={{
					thumbnail: {
						metadata: imageMetadata,
					},
				}}
			/>

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
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						headerLeft: () => <BackLink />,
					}}
				/>

				<Stack.Screen
					name="[sessionId]"
					options={{
						headerTitle: '',
						headerShown: true,
						headerTransparent: true,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					}}
				/>
			</Stack>
		</View>
	)
}
