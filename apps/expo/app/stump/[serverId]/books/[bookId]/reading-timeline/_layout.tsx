import { Stack } from 'expo-router'
import { View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useDerivedColorPalette } from '~/providers/DerivedColorPalette'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { t } = useTranslate()
	const { imageMetadata } = useDerivedColorPalette()

	const listColors = usePreferencesStore((store) => store.tintListBackground)

	return (
		<View style={{ flex: 1 }}>
			{listColors && <ScreenBackgroundGradient imageMetadata={imageMetadata} />}

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
						headerTitle: t('readingTimeline.title'),
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
