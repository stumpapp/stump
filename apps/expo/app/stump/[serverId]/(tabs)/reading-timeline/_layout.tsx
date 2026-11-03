import { Stack } from 'expo-router'
import { Platform, View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import { IS_IOS_26_PLUS, usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { translate } = useTranslate()
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
						headerTitle: translate('shared.readingTimeline.title'),
						// for whatever reason, the navigation.setOptions({...}) call won't work unless we set the headerBackground here
						// i assume it is some lifecycle issue either with some nuance of stump or in react-navigation itself, but this
						// is a fine enough workaround for now
						headerBackground: Platform.OS === 'android' ? () => <View /> : undefined,
						headerShown: true,
						headerTransparent: Platform.OS === 'ios',
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
