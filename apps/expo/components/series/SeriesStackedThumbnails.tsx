import { useSDK } from '@stump/client'
import { ImageRef } from '@stump/graphql'
import { ColorSpace, getColor, OKLCH, serialize, set, sRGB } from 'colorjs.io/fn'
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
	width: number
}

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

type ThumbnailConfig = {
	x: number // fractional horizontal position of the center of the thumbnail within the series card
	y: number // fraction of the thumbnail that is hidden
	scale: number
	zIndex: number
}

const THREE_BOOK_LAYOUT: ThumbnailConfig[] = [
	{ x: 0.5, y: 0.081, scale: 1.081, zIndex: 40 },
	{ x: 0.373, y: 0.086, scale: 0.973, zIndex: 30 },
	{ x: 0.648, y: 0.081, scale: 0.908, zIndex: 20 },
]

const TWO_BOOK_LAYOUT: ThumbnailConfig[] = [
	{ x: 0.436, y: 0.081, scale: 1.081, zIndex: 30 },
	{ x: 0.606, y: 0.097, scale: 0.973, zIndex: 20 },
]

const ONE_BOOK_LAYOUT: ThumbnailConfig[] = [{ x: 0.5, y: 0.081, scale: 1.081, zIndex: 20 }]

export default function SeriesStackedThumbnails({ thumbnailData, width: cardWidth }: Props) {
	const { sdk } = useSDK()
	const { isDarkColorScheme } = useColorScheme()
	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const baseThumbnailWidth = cardWidth * 0.7
	const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio
	const cardHeight = baseThumbnailHeight + 82.5

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0: { color: 'rgba(0, 0, 0, 0.7)' },
			0.5: { color: 'transparent' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0, 0, 0.9, 0.9),
	})

	const renderThumbnails = () => {
		let layoutConfig: ThumbnailConfig[] = []
		if (thumbnailData.length >= 3) layoutConfig = THREE_BOOK_LAYOUT
		else if (thumbnailData.length === 2) layoutConfig = TWO_BOOK_LAYOUT
		else if (thumbnailData.length === 1) layoutConfig = ONE_BOOK_LAYOUT
		else return null

		return layoutConfig.map((config, index) => {
			const currentThumbnailData = thumbnailData[index]

			if (!currentThumbnailData) return null

			const currentThumbnailSize = {
				width: baseThumbnailWidth * config.scale,
				height: baseThumbnailHeight * config.scale,
			}

			const leftOffset = cardWidth * config.x - currentThumbnailSize.width / 2
			const translateY = baseThumbnailHeight * config.y

			return (
				<View
					key={index}
					className="absolute bottom-0"
					style={{
						zIndex: config.zIndex,
						left: leftOffset,
						transform: [{ translateY: translateY }],
					}}
				>
					<ThumbnailImage
						source={{
							uri: currentThumbnailData.url,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={currentThumbnailSize}
						borderAndShadowStyle={{ shadowColor: 'rgba(0 0 0 / 0.4)', shadowRadius: 3 }}
						placeholderData={currentThumbnailData.metadata}
					/>
				</View>
			)
		})
	}

	const mainThumbnailAverageColor = thumbnailData[0]?.metadata?.averageColor

	let backgroundColor
	if (mainThumbnailAverageColor) {
		const color = getColor(mainThumbnailAverageColor)
		set(color, {
			'oklch.l': isDarkColorScheme ? 0.3 : 0.9,
			'oklch.c': (c) => (c + 0.05) / 2,
		})
		backgroundColor = serialize(color, { format: 'hex' })
	} else if (accentColor) {
		// Take the hue of the accentColor and give it the same chroma and lightness as colors.thumbnail.stack.series
		const color = getColor(accentColor)
		const modifiedColor = set(color, {
			'oklch.l': isDarkColorScheme ? 0.38 : 0.8,
			'oklch.c': 0.04,
		})
		backgroundColor = serialize(modifiedColor, { format: 'hex' })
	} else {
		backgroundColor = colors.thumbnail.stack.series
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
				style={{
					width: cardWidth,
					height: cardHeight,
					backgroundColor,
				}}
			>
				{renderThumbnails()}
			</View>
		</BorderAndShadow>
	)
}
