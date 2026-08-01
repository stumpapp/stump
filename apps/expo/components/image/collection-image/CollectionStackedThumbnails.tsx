import { useSDK } from '@stump/client'
import { ImageRef } from '@stump/graphql'
import {
	ColorSpace,
	darken,
	getColor,
	Lab,
	lighten,
	OKLab,
	PlainColorObject,
	serialize,
	sRGB,
	steps,
} from 'colorjs.io/fn'
import { Easing, View } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'

import { BorderAndShadow } from '~/components/BorderAndShadow'
import { usePalette } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../ThumbnailImage'
import { getLayoutConfig } from './getLayoutConfig'
import { useCollectionItemSize } from './useCollectionSizes'

ColorSpace.register(sRGB)
ColorSpace.register(Lab)
ColorSpace.register(OKLab)

type Props = {
	thumbnailData: ImageRef[]
	layoutNumber: number | undefined
}

export default function CollectionStackedThumbnails({ thumbnailData, layoutNumber }: Props) {
	const { sdk } = useSDK()
	const { itemWidth: cardWidth } = useCollectionItemSize()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const { isDarkColorScheme } = useColorScheme()

	const baseThumbnailWidth = cardWidth * 0.282
	const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio
	const cardHeight = baseThumbnailHeight

	const renderThumbnails = () => {
		if (layoutNumber === undefined) return null
		const layoutConfig = getLayoutConfig(thumbnailData.length, layoutNumber)

		return layoutConfig.map((config, index) => {
			const currentThumbnailData = thumbnailData[index]
			if (!currentThumbnailData) return null

			const currentThumbnailSize = {
				width: baseThumbnailWidth * config.scale,
				height: baseThumbnailHeight * config.scale,
			}

			const leftOffset = cardWidth * config.x - currentThumbnailSize.width / 2
			const translateY = cardHeight * config.y

			return (
				<View
					key={index}
					className="bottom-0 absolute"
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
						size={currentThumbnailSize}
						borderAndShadowStyle={{ shadowColor: 'rgba(0 0 0 / 0.5)', shadowRadius: 3 }}
						placeholderData={currentThumbnailData.metadata}
						originalDimensions={
							currentThumbnailData.width && currentThumbnailData.height
								? { width: currentThumbnailData.width, height: currentThumbnailData.height }
								: undefined
						}
					/>
				</View>
			)
		})
	}

	const avgColors = thumbnailData.map((t) => t.metadata?.averageColor)

	const midIndex = thumbnailData.length === 5 ? 2 : thumbnailData.length === 3 ? 1 : undefined

	// Using 5 or 4 colours is too busy so:
	// 3 or 5 thumbnails -> 3 colours
	// 2 or 4 thumbnails -> 2 colours
	// 1 thumbnail / accentColor -> generate a lighter and darker colour to interpolate between
	let usableColors: string[] | undefined
	if (avgColors.at(0) && midIndex && avgColors.at(midIndex) && avgColors.at(-1)) {
		usableColors = [avgColors.at(0)!, avgColors.at(midIndex)!, avgColors.at(-1)!]
	} else if (avgColors.at(0) && avgColors.at(-1)) {
		usableColors = [avgColors.at(0)!, avgColors.at(-1)!]
	}

	const palette = usePalette({
		start: { light: 300, dark: 950, chromaScale: 0.8 },
		end: { light: 200, dark: 900, chromaScale: 0.5 },
	})

	let backgroundGradient: string[] | undefined
	if (usableColors) {
		const plainColors: PlainColorObject[] = usableColors.map((c) => getColor(c))

		if (thumbnailData.length === 1) {
			darken(plainColors[0] || '', 0.2)
			lighten(plainColors[1] || '', 0.2)
		}

		backgroundGradient = []
		for (let i = 0; i < plainColors.length - 1; i++) {
			const interpolation = steps(plainColors[i] || '', plainColors[i + 1] || '', {
				space: OKLab,
				outputSpace: sRGB,
				steps: 5,
			}).map((c) => {
				darken(c, isDarkColorScheme ? 0.5 : 0.1)
				return serialize(c, { format: 'hex' })
			})
			backgroundGradient.push(...interpolation)
		}
	} else {
		backgroundGradient = [palette.start, palette.end]
	}

	return (
		<BorderAndShadow
			style={{
				borderRadius: 12,
				borderWidth: 0.5,
				shadowColor: 'rgba(0 0 0 / 0.3)',
				shadowOffset: { width: 0, height: 1 },
				shadowRadius: 2,
			}}
		>
			<LinearGradient {...GRADIENT} style={{ position: 'absolute', zIndex: 60, inset: 0 }} />

			<LinearGradient
				colors={backgroundGradient}
				useAngle={true}
				angle={75}
				style={{ position: 'absolute', zIndex: 5, inset: 0 }}
			/>

			<View
				style={{
					width: cardWidth,
					height: cardHeight,
				}}
			>
				{renderThumbnails()}
			</View>
		</BorderAndShadow>
	)
}

const GRADIENT = easeGradient({
	colorStops: {
		0.4: { color: 'transparent' },
		1: { color: 'rgba(0 0 0 / 0.8)' },
	},
	extraColorStopsPerTransition: 16,
	easing: Easing.bezier(0.42, 0, 1, 1),
})
