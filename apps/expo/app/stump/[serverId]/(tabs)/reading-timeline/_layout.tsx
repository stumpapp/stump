import { Stack } from 'expo-router'
import { View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import { IS_IOS_26_PLUS, usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { t } = useTranslate()
	const accentColor = usePalette('accent')
	const listColors = usePreferencesStore((store) => store.tintListBackground)

	return (
		<View style={{ flex: 1 }}>
			{listColors && (
				<ScreenBackgroundGradient
					imageMetadata={{
						averageColor: accentColor,
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
						headerTitle: t('readingTimeline.title'),
						headerShown: true,
						headerTransparent: true,
						headerLargeTitleEnabled: true,
						headerLargeTitleStyle: { fontSize: 30 },
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
					}}
				/>

				{/*TODO(reading-timeline): determine if need separate sessionId route
				in this stack or if acceptable to remain in bookId stack*/}
			</Stack>
		</View>
	)
}
