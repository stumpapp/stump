import { useMemo } from 'react'
import { Platform, StyleProp, View, ViewStyle } from 'react-native'
import LinearGradient, { LinearGradientProps } from 'react-native-linear-gradient'
import TImage, { type TurboImageProps } from 'react-native-turbo-image'

import { usePreferencesStore } from '~/stores'

import { BorderAndShadow, BorderAndShadowStyle } from '../BorderAndShadow'
import {
	ThumbnailPlaceholder,
	ThumbnailPlaceholderData,
	ThumbnailResizeMode,
} from './ThumbnailPlaceholder'

type ThumbnailImageProps = {
	size: { height: number; width: number }
	gradient?: LinearGradientProps
	style?: StyleProp<Omit<ViewStyle, 'width' | 'height'>>
	placeholderData?: ThumbnailPlaceholderData | null
	originalDimensions?: { width: number; height: number } | null
	/**
	 * Override the default border and shadow style.
	 */
	borderAndShadowStyle?: Partial<BorderAndShadowStyle>
} & Omit<TurboImageProps, 'style' | 'resize' | 'resizeMode'>

export const ThumbnailImage = ({
	source,
	style,
	size,
	gradient,
	borderAndShadowStyle,
	placeholderData,
	originalDimensions,
	...props
}: ThumbnailImageProps) => {
	const borderRadius = borderAndShadowStyle?.borderRadius ?? size.width / 20
	const borderWidth = borderAndShadowStyle?.borderWidth ?? Math.max(0.3, size.width / 500)
	const shadowRadius = borderAndShadowStyle?.shadowRadius ?? size.width / 100
	const shadowColor = borderAndShadowStyle?.shadowColor ?? 'rgba(0,0,0,0.2)'
	const shadowOffset = borderAndShadowStyle?.shadowOffset ?? { width: 0, height: 1 }

	const resizeMode = usePreferencesStore((state) => state.thumbnailResizeMode)

	const isFitMode = resizeMode === 'fit'

	const { innerSize, effectiveResizeMode } = useMemo(() => {
		const originalWidth = originalDimensions?.width
		const originalHeight = originalDimensions?.height

		if (resizeMode !== 'fit') {
			return { innerSize: size, effectiveResizeMode: resizeMode }
		}

		if (originalWidth && originalHeight) {
			const fitSize = calculateFitDimensions(size.width, size.height, originalWidth, originalHeight)
			return { innerSize: fitSize, effectiveResizeMode: 'cover' as const }
		}

		return { innerSize: size, effectiveResizeMode: 'cover' as const }
	}, [resizeMode, size, originalDimensions?.width, originalDimensions?.height])

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

	// Note: I used a slightly smaller border radius for fit because it looked better
	// than matching it with outside container
	const innerBorderRadius = isFitMode ? Math.max(0, borderRadius - 2) : 0

	return (
		<View className="items-center">
			<BorderAndShadow
				style={{
					borderRadius,
					borderWidth,
					shadowRadius,
					shadowColor,
					shadowOffset,
				}}
			>
				{Platform.OS === 'ios' && gradientElement}

				<ThumbnailPlaceholder placeholderData={placeholderData} style={{ zIndex: 10 }} />

				<View
					style={[
						size,
						{ zIndex: 15, justifyContent: 'center', alignItems: 'center' },
						isFitMode && { overflow: 'hidden' },
					]}
				>
					<TImage
						source={source}
						cachePolicy="dataCache"
						// @ts-expect-error: bug in library ImageStyle should be ViewStyle
						style={[innerSize, isFitMode && { borderRadius: innerBorderRadius }, style]}
						resize={size.width * 1.5}
						fadeDuration={800}
						resizeMode={effectiveResizeMode}
						// This is a weird workaround:
						// Using the indicator prop hides the built in grey placeholder on ios (what we want)
						// but will force show a circular loading indicator on all platforms, so we make it transparent.
						// Android doesn't support transparent (and doesn't have built in placeholders) so we do nothing.
						{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
						{...props}
					/>
				</View>
			</BorderAndShadow>

			{Platform.OS === 'android' && gradientElement}
		</View>
	)
}

const FIT_X_PADDING = 16

export function calculateFitDimensions(
	containerWidth: number,
	containerHeight: number,
	originalWidth: number,
	originalHeight: number,
): { width: number; height: number } {
	const containerRatio = containerWidth / containerHeight
	const imageRatio = originalWidth / originalHeight

	if (imageRatio > containerRatio) {
		// Image is wider than container ratio -> fit to width
		return {
			width: containerWidth - FIT_X_PADDING,
			height: containerWidth / imageRatio,
		}
	} else {
		// Image is taller than container ratio -> fit to height
		return {
			width: containerHeight * imageRatio,
			height: containerHeight,
		}
	}
}

type GetThumbnailResizePropsParams = {
	containerWidth: number
	containerHeight: number
	originalWidth: number
	originalHeight: number
}

export function getThumbnailResizeProps(
	thumbnailResizeMode: ThumbnailResizeMode,
	{ containerWidth, containerHeight, originalWidth, originalHeight }: GetThumbnailResizePropsParams,
): { resizeMode: 'cover' | 'stretch'; style?: { width: number; height: number } } {
	if (thumbnailResizeMode === 'stretch') {
		return { resizeMode: 'stretch' }
	}

	if (thumbnailResizeMode === 'fit') {
		const fitDimensions = calculateFitDimensions(
			containerWidth,
			containerHeight,
			originalWidth,
			originalHeight,
		)
		// Note: This might feel convoluted but the reason I avoided `contain` is because we
		// wouldn't be able to add the border radius. We would have sharp edges inside the
		// rounded container which looks poopy
		return { resizeMode: 'cover', style: fitDimensions }
	}

	return { resizeMode: 'cover' }
}
