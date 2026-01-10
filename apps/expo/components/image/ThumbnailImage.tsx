import { Platform, StyleProp, View, ViewStyle } from 'react-native'
import LinearGradient, { LinearGradientProps } from 'react-native-linear-gradient'
import TImage, { type TurboImageProps } from 'react-native-turbo-image'

import { BorderAndShadow, BorderAndShadowStyle } from '../BorderAndShadow'
import { ThumbnailPlaceholder, ThumbnailPlaceholderData } from './ThumbnailPlaceholder'

type ThumbnailImageProps = {
	size: { height: number; width: number }
	gradient?: LinearGradientProps
	style?: StyleProp<Omit<ViewStyle, 'width' | 'height'>>
	placeholderData?: ThumbnailPlaceholderData | null
	/**
	 * Override the default border and shadow style.
	 */
	borderAndShadowStyle?: Partial<BorderAndShadowStyle>
} & Omit<TurboImageProps, 'style' | 'resize'>

export const ThumbnailImage = ({
	source,
	style,
	size,
	gradient,
	borderAndShadowStyle,
	placeholderData,
	...props
}: ThumbnailImageProps) => {
	const borderRadius = borderAndShadowStyle?.borderRadius ?? size.width / 20
	const borderWidth = borderAndShadowStyle?.borderWidth ?? Math.max(0.3, size.width / 500)
	const shadowRadius = borderAndShadowStyle?.shadowRadius ?? size.width / 100
	const shadowColor = borderAndShadowStyle?.shadowColor ?? 'rgba(0,0,0,0.2)'
	const shadowOffset = borderAndShadowStyle?.shadowOffset ?? { width: 0, height: 1 }

	// TODO(thumb-placeholders): Test more on Android
	// Using overflow: 'hidden' on android cuts off a tiny bit more than necessary from the edges of
	// <LinearGradient />, which also causes flickering on the carousel.
	// So we must not make it a child of BorderAndShadow, and must use inset: -0.1 and manually round the corners
	const gradientElement = gradient?.colors && (
		<LinearGradient
			colors={gradient.colors}
			locations={gradient.locations}
			style={{
				position: 'absolute',
				zIndex: 20,
				inset: Platform.OS === 'android' ? -0.1 : 0,
				borderRadius: Platform.OS === 'android' ? borderRadius : undefined,
			}}
		/>
	)

	return (
		<View>
			<BorderAndShadow
				style={{ borderRadius, borderWidth, shadowRadius, shadowColor, shadowOffset }}
			>
				{Platform.OS === 'ios' && gradientElement}

				<ThumbnailPlaceholder {...placeholderData} />

				<TImage
					source={source}
					cachePolicy="dataCache"
					// @ts-expect-error: bug in library ImageStyle should be ViewStyle
					style={[size, { zIndex: 15 }, style]}
					resize={size.width * 1.5}
					fadeDuration={800}
					// This is a weird workaround:
					// Using the indicator prop hides the built in grey placeholder on ios (what we want)
					// but will force show a circular loading indicator on all platforms, so we make it transparent.
					// Android doesn't support transparent (and doesn't have built in placeholders) so we do nothing.
					{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
					{...props}
				/>
			</BorderAndShadow>

			{Platform.OS === 'android' && gradientElement}
		</View>
	)
}
