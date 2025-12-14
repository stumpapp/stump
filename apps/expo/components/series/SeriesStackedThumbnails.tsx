import { useSDK } from '@stump/client'
import { ImageRef } from '@stump/graphql'
import { ColorSpace, darken, OKLCH, parse, serialize, set, sRGB, to } from 'colorjs.io/fn'
import { Easing, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { BorderAndShadow } from '../BorderAndShadow'
import { ThumbnailImage } from '../image'

type Props = {
	thumbnailData: ImageRef[]
}

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

export default function SeriesStackedThumbnails({ thumbnailData }: Props) {
	const { sdk } = useSDK()
	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0: { color: 'rgba(0, 0, 0, 0.7)' },
			0.5: { color: 'transparent' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0, 0, 0.9, 0.9),
	})

	const mainSize = {
		height: 125 / thumbnailRatio,
		width: 125,
	}
	const smallSize = {
		height: mainSize.height * 0.9,
		width: mainSize.width * 0.9,
	}
	const containerSize = {
		// height = main thumbnail height - its translate downwards amount (1.25rem) + add space for text
		height: mainSize.height - 17.5 + 82.5,
		width: 165,
	}

	const renderThumbnails = () => {
		if (thumbnailData.length > 2) {
			return (
				<>
					{/* Left Image */}
					<View className="absolute z-30 -translate-x-6 translate-y-5">
						<ThumbnailImage
							source={{
								uri: thumbnailData[1].url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={smallSize}
							borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.3)', shadowRadius: 2 }}
							placeholderData={thumbnailData[1].metadata}
						/>
					</View>

					{/* Center Image */}
					<View className="z-40 translate-y-5">
						<ThumbnailImage
							source={{
								uri: thumbnailData[0].url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={mainSize}
							borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.5)', shadowRadius: 3 }}
							placeholderData={thumbnailData[0].metadata}
						/>
					</View>

					{/* Right Image */}
					<View className="absolute z-20 translate-x-6 translate-y-9">
						<ThumbnailImage
							source={{
								uri: thumbnailData[2].url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={smallSize}
							borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.2)', shadowRadius: 2 }}
							placeholderData={thumbnailData[2].metadata}
						/>
					</View>
				</>
			)
		} else if (thumbnailData.length === 2) {
			return (
				<>
					{/* Left Image */}
					<View className="z-30 -translate-x-3 translate-y-5">
						<ThumbnailImage
							source={{
								uri: thumbnailData[0].url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={mainSize}
							borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.5)', shadowRadius: 3 }}
							placeholderData={thumbnailData[0].metadata}
						/>
					</View>

					{/* Right Image */}
					<View className="absolute z-20 translate-x-5 translate-y-6">
						<ThumbnailImage
							source={{
								uri: thumbnailData[1].url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							size={smallSize}
							borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.3)', shadowRadius: 2 }}
							placeholderData={thumbnailData[1].metadata}
						/>
					</View>
				</>
			)
		} else {
			return (
				<View className="z-20 translate-y-5">
					<ThumbnailImage
						source={{
							uri: thumbnailData[0].url,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={mainSize}
						borderAndShadowStyle={{ shadowColor: 'rgba(0,0,0,0.3)', shadowRadius: 3 }}
						placeholderData={thumbnailData[0].metadata}
					/>
				</View>
			)
		}
	}

	const mainThumbnailAverageColor = thumbnailData[0].metadata?.averageColor

	let backgroundColor
	if (mainThumbnailAverageColor) {
		const color = parse(mainThumbnailAverageColor)
		const darkerColor = darken(color, isDarkColorScheme ? 0.33 : 0.1)
		backgroundColor = serialize(darkerColor, { format: 'hex' })
	} else if (accentColor) {
		// Take the hue of the accentColor and give it the same chroma and lightness as colors.thumbnail.stack
		const color = parse(accentColor)
		const oklch = to(color, OKLCH)
		const modifiedColor = set(oklch, {
			'oklch.l': isDarkColorScheme ? 0.38 : 0.8,
			'oklch.c': 0.04,
		})
		const srgb = to(modifiedColor, sRGB)
		backgroundColor = serialize(srgb, { format: 'hex' })
	} else {
		backgroundColor = colors.thumbnail.stack
	}

	return (
		<BorderAndShadow
			style={{
				borderRadius: 12,
				borderWidth: 0.5,
				shadowColor: 'rgba(0,0,0,0.2)',
				shadowOffset: { width: 0, height: 1 },
				shadowRadius: 2,
			}}
		>
			<LinearGradient
				colors={gradientColors}
				locations={gradientLocations}
				style={{ position: 'absolute', zIndex: 10, inset: 0 }}
			/>

			<View
				className="items-center justify-end"
				style={{
					...containerSize,
					backgroundColor,
				}}
			>
				{renderThumbnails()}
			</View>
		</BorderAndShadow>
	)
}
