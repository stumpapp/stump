import { cn } from '@stump/components'
import { ImageRef } from '@stump/graphql'
import { ColorSpace, getColor, OKLCH, serialize, set, sRGB } from 'colorjs.io/fn'
import { useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

import { ThumbnailImage } from './ThumbnailImage'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

type ThumbnailConfig = {
	/**
	 * The fractional horizontal position of the center of the thumbnail within the series card
	 */
	x: number
	/**
	 * The fraction of the thumbnail that is hidden
	 */
	y: number
	/**
	 * This is the fraction of the series card's width to move to the left or right by
	 */
	hoverX: number
	/**
	 * The fraction of the thumbnail that is hidden on hover
	 */
	hoverY: number
	hoverRotate: number
	scale: number
	zIndex: number
}

const THREE_BOOK_LAYOUT: ThumbnailConfig[] = [
	{ x: 0.5, y: 0.081, hoverX: 0, hoverY: 0.0, hoverRotate: 0, scale: 1.081, zIndex: 40 },
	{ x: 0.373, y: 0.086, hoverX: -0.035, hoverY: 0.0, hoverRotate: -5, scale: 0.973, zIndex: 30 },
	{ x: 0.648, y: 0.081, hoverX: 0.035, hoverY: 0.0, hoverRotate: 5, scale: 0.908, zIndex: 20 },
]

const TWO_BOOK_LAYOUT: ThumbnailConfig[] = [
	{ x: 0.436, y: 0.081, hoverX: -0.045, hoverY: 0.0, hoverRotate: -5, scale: 1.081, zIndex: 30 },
	{ x: 0.606, y: 0.097, hoverX: 0.045, hoverY: 0.0, hoverRotate: 5, scale: 0.973, zIndex: 20 },
]

const ONE_BOOK_LAYOUT: ThumbnailConfig[] = [
	{ x: 0.5, y: 0.081, hoverX: 0.0, hoverY: 0.0, hoverRotate: 0, scale: 1.081, zIndex: 20 },
]

type Props = {
	thumbnailData: ImageRef[]
	width: number
	className?: string
}

export function SeriesStackedThumbnails({ thumbnailData, width: cardWidth, className }: Props) {
	const { isDarkVariant, getColor: getThemeColor } = useTheme()
	const {
		preferences: { thumbnailRatio, enableFancyAnimations },
	} = usePreferences()
	const [isTouchDevice] = useState(() => !!('ontouchstart' in window))
	const isDesktop = useMediaMatch('(min-width: 1024px)')

	const baseThumbnailWidth = cardWidth * 0.7
	const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio
	const cardHeight = baseThumbnailHeight + 100

	const mainThumbnailAverageColor = thumbnailData[0]?.metadata?.averageColor

	const backgroundColor = useMemo(() => {
		if (mainThumbnailAverageColor) {
			const color = getColor(mainThumbnailAverageColor)
			set(color, {
				'oklch.l': isDarkVariant ? 0.3 : 0.9,
				'oklch.c': (c) => (c + 0.05) / 2,
			})
			return serialize(color, { format: 'hex' })
		}
		return getThemeColor('thumbnail.stack.series') ?? (isDarkVariant ? '#2a2a2e' : '#e5e5e7')
	}, [mainThumbnailAverageColor, isDarkVariant, getThemeColor])

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

			const shouldAnimate = enableFancyAnimations && !isTouchDevice && isDesktop

			const leftOffset = cardWidth * config.x - currentThumbnailSize.width / 2
			const translateY = baseThumbnailHeight * config.y

			const hoverTranslateY = baseThumbnailHeight * config.hoverY
			const hoverTranslateX = cardWidth * config.hoverX
			const hoverRotate = config.hoverRotate

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
					className={cn(
						'absolute bottom-0 will-change-transform',
						'translate-x-[var(--x)] translate-y-[var(--y)] rotate-[var(--r)]',
						shouldAnimate && [
							'transform-gpu duration-300',
							'group-hover:translate-x-[var(--x-hover)] group-hover:translate-y-[var(--y-hover)] group-hover:rotate-[var(--r-hover)]',
						],
					)}
					style={
						{
							zIndex: config.zIndex,
							left: leftOffset,
							'--x': '0px',
							'--x-hover': shouldAnimate ? `${hoverTranslateX}px` : '0px',
							'--y': `${translateY}px`,
							'--y-hover': shouldAnimate ? `${hoverTranslateY}px` : `${translateY}px`,
							'--r': '0deg',
							'--r-hover': shouldAnimate ? `${hoverRotate}deg` : '0deg',
						} as React.CSSProperties
					}
				>
					<ThumbnailImage
						src={currentThumbnailData.url}
						size={currentThumbnailSize}
						placeholderData={placeholderData}
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

	// We need to only hide the parts of the thumbnails that go under the bottom of the card
	// but we also account for the bottom left and right rounded corners of the card
	// If we didn't need to account for the rounded corners, we could just use style={{ clipPath: 'inset(-10% -10% 1px -10%)' }}
	const outerRadius = 12
	const borderWidth = 1
	const buffer = 20

	const innerRadius = outerRadius - borderWidth

	/**
	 * clipPath Logic - We want the thumbnails to spill over the left and right sides of the card,
	 * but go under the bottom edge of the card, so we create this shape:
	 * https://yqnn.github.io/svg-path-editor/#P=M_-6_-6_L_48_-6_L_48_64_L_42_64_A_6_6_0_0_1_36_70_L_6_70_A_6_6_0_0_1_0_64_L_-6_64_Z
	 *
	 * The 0 0 point is at the top left corner of the card. We start at -20 -20 and create the path clockwise.
	 *
	 * Note: Arc notation 0 0 1 means no ellipse rotation, short arc, clockwise
	 */
	const clipPath = `
		M -${buffer} -${buffer} 
		L ${cardWidth + buffer} -${buffer} 
		L ${cardWidth + buffer} ${cardHeight - outerRadius} 
		L ${cardWidth - borderWidth} ${cardHeight - outerRadius} 
		A ${innerRadius} ${innerRadius} 0 0 1 ${cardWidth - outerRadius} ${cardHeight - borderWidth} 
		L ${outerRadius} ${cardHeight - borderWidth} 
		A ${innerRadius} ${innerRadius} 0 0 1 ${borderWidth} ${cardHeight - outerRadius} 
		L -${buffer} ${cardHeight - outerRadius} 
		Z
	`
	const clipPathString = clipPath.replace(/\s+/g, ' ').trim()

	if (thumbnailData.length === 0) {
		return null
	}

	return (
		<div
			className={cn('relative', className)}
			style={{
				width: cardWidth,
				height: cardHeight,
			}}
		>
			<div
				className="absolute inset-0 overflow-hidden rounded-xl border border-edge/50"
				style={{
					backgroundColor,
					boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
					contain: 'layout style paint',
				}}
			>
				<div className="pointer-events-none absolute inset-0 z-10" style={gradientStyle} />
			</div>

			<div className="absolute inset-0 z-20" style={{ clipPath: `path('${clipPathString}')` }}>
				{renderThumbnails()}
			</div>
		</div>
	)
}
