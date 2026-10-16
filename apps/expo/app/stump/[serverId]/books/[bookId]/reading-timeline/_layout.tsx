import { Stack, useLocalSearchParams } from 'expo-router'
import { Platform, View } from 'react-native'

import {
	getScreenTintColor,
	ScreenBackgroundGradient,
	ScreenHeaderBackground,
} from '~/components/BackgroundGradient'
import BackLink from '~/components/BackLink'
import { compositeColorOverBase, IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useDerivedColorPalette } from '~/providers/DerivedColorPalette'
import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const { from } = useLocalSearchParams<{ sessionId: string; from?: string }>()
	const { translate } = useTranslate()
	const { imageMetadata } = useDerivedColorPalette()
	const colors = useColors()

	const listColors = usePreferencesStore((store) => store.tintListBackground)
	const tintColor = listColors ? getScreenTintColor(imageMetadata) : undefined
	// since the stack now has a bg color it would be visible while rn transitions,
	// so ive composited the tint over the bg to get it close to what the gradient
	// would overly behind the content
	const sessionBackgroundColor = tintColor
		? compositeColorOverBase(`${tintColor}cc`, colors.background.DEFAULT)
		: colors.background.DEFAULT

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
						headerTitle: translate('shared.readingTimeline.title'),
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
						headerBackground:
							Platform.OS === 'android'
								? () => (
										<ScreenHeaderBackground
											color={tintColor}
											baseColor={colors.background.DEFAULT}
										/>
									)
								: undefined,
						headerBlurEffect: IS_IOS_26_PLUS ? undefined : 'regular',
						// when jumped to here from root timeline the stack doesn't inject a back so
						// we add it manually
						headerLeft: from != null ? () => <BackLink /> : undefined,
						contentStyle: {
							backgroundColor: sessionBackgroundColor,
						},
					}}
				/>
			</Stack>
		</View>
	)
}
