import { FadingView, SurfaceComponentProps } from '@codeherence/react-native-header'
import { BlurView } from 'expo-blur'
import { Platform, StyleSheet, View } from 'react-native'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

const BLUR_AVAILABLE =
	Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31)

export default function ScrollHeaderSurface({ showNavBar }: SurfaceComponentProps) {
	const { isDarkColorScheme } = useColorScheme()

	const colors = useColors()

	return (
		<FadingView opacity={showNavBar} style={StyleSheet.absoluteFill}>
			{BLUR_AVAILABLE && (
				<BlurView style={StyleSheet.absoluteFill} tint={isDarkColorScheme ? 'dark' : 'light'} />
			)}
			{!BLUR_AVAILABLE && (
				<View
					style={[
						StyleSheet.absoluteFill,
						{
							backgroundColor: colors.background.DEFAULT,
						},
					]}
				/>
			)}
		</FadingView>
	)
}
