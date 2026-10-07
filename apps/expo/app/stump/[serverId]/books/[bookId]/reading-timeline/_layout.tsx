import { Stack, useLocalSearchParams } from 'expo-router'
import { Platform, View } from 'react-native'

import { ScreenBackgroundGradient } from '~/components/BackgroundGradient'
import BackLink from '~/components/BackLink'
import { IS_IOS_26_PLUS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useDerivedColorPalette } from '~/providers/DerivedColorPalette'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { from } = useLocalSearchParams<{ sessionId: string; from?: string }>()
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
						headerTransparent: Platform.OS === 'ios',
						headerBackground: Platform.OS === 'android' ? () => <View /> : undefined,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						headerLeft: () => <BackLink />,
					}}
				/>

				<Stack.Screen
					name="[sessionId]"
					options={{
						headerTitle: '',
						headerShown: true,
						headerTransparent: Platform.OS === 'ios',
						headerBackground: Platform.OS === 'android' ? () => <View /> : undefined,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						// when jumped to here from root timeline the stack doesn't inject a back so
						// we add it manually
						headerLeft: from != null ? () => <BackLink /> : undefined,
					}}
				/>
			</Stack>
		</View>
	)
}
