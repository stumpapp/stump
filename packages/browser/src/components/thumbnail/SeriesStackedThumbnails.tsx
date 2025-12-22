import { cn } from '@stump/components'
import { ImageRef } from '@stump/graphql'
import { ColorSpace, darken, getColor, OKLCH, serialize, sRGB } from 'colorjs.io/fn'
import { useMemo } from 'react'

import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

import { ThumbnailImage } from './ThumbnailImage'

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

type Props = {
	thumbnailData: ImageRef[]
	width: number
	className?: string
}

export function SeriesStackedThumbnails({ thumbnailData, width: cardWidth, className }: Props) {
	const { isDarkVariant } = useTheme()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const baseThumbnailWidth = cardWidth * 0.7
	const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio
	const cardHeight = baseThumbnailHeight + 100

	const mainThumbnailAverageColor = thumbnailData[0]?.metadata?.averageColor

	const backgroundColor = useMemo(() => {
		if (mainThumbnailAverageColor) {
			const color = getColor(mainThumbnailAverageColor)
			const darkerColor = darken(color, isDarkVariant ? 0.33 : 0.1)
			return serialize(darkerColor, { format: 'hex' })
		}
		// TODO(thumbs): Replace with theme colors like expo thumbnail.stack.series
		return isDarkVariant ? '#2a2a2e' : '#e5e5e7'
	}, [mainThumbnailAverageColor, isDarkVariant])

	const gradientStyle = useMemo(
		() => ({
			background: `linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 25%, transparent 50%)`,
		}),
		[],
	)

	const layoutConfig = useMemo(() => {
		if (thumbnailData.length >= 3) return THREE_BOOK_LAYOUT
		if (thumbnailData.length === 2) return TWO_BOOK_LAYOUT
		if (thumbnailData.length === 1) return ONE_BOOK_LAYOUT
		return []
	}, [thumbnailData.length])

	const renderThumbnails = () => {
		return layoutConfig.map((config, index) => {
			const currentThumbnailData = thumbnailData[index]
			if (!currentThumbnailData) return null

			const currentThumbnailSize = {
				width: baseThumbnailWidth * config.scale,
				height: baseThumbnailHeight * config.scale,
			}

			const leftOffset = cardWidth * config.x - currentThumbnailSize.width / 2
			const translateY = baseThumbnailHeight * config.y

			const placeholderData = currentThumbnailData.metadata
				? {
						averageColor: currentThumbnailData.metadata.averageColor,
						colors: currentThumbnailData.metadata.colors,
						thumbhash: currentThumbnailData.metadata.thumbhash,
					}
				: undefined

			// Note: I add lazy for back thumbs to try and improve performance
			const isBackThumbnail = index > 0

			return (
				<div
					key={index}
					className="absolute bottom-0 will-change-transform"
					style={{
						zIndex: config.zIndex,
						left: leftOffset,
						transform: `translateY(${translateY}px)`,
					}}
				>
					<ThumbnailImage
						src={currentThumbnailData.url}
						size={currentThumbnailSize}
						placeholderData={placeholderData}
						placeholderVariant="colorful"
						lazy={isBackThumbnail}
						borderAndShadowStyle={{
							shadowColor: 'rgba(0, 0, 0, 0.4)',
							shadowRadius: 3,
						}}
					/>
				</div>
			)
		})
	}

	if (thumbnailData.length === 0) {
		return null
	}

	return (
		<div
			className={cn('relative overflow-hidden rounded-xl border border-edge/50', className)}
			style={{
				width: cardWidth,
				height: cardHeight,
				backgroundColor,
				boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
				contain: 'layout style paint',
			}}
		>
			<div className="pointer-events-none absolute inset-0 z-10" style={gradientStyle} />

			{renderThumbnails()}
		</div>
	)
}
