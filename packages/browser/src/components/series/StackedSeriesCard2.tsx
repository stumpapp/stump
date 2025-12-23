import { cn, Text } from '@stump/components'
import { LibrarySeriesQuery } from '@stump/graphql'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'
import { usePrefetchSeries } from '@/scenes/series'
import { usePrefetchSeriesBooks } from '@/scenes/series/tabs/books/SeriesBooksScene'

import pluralizeStat from '../../utils/pluralize'
import { ThumbnailImage } from '../thumbnail/ThumbnailImage'

export type StackedSeriesCard2Data = LibrarySeriesQuery['series']['nodes'][number]

type ThumbnailConfig = {
	x: number
	y: number
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
	data: StackedSeriesCard2Data
}

const StackedSeriesCard2 = memo(function StackedSeriesCard2({ data }: Props) {
	const paths = usePaths()
	const containerRef = useRef<HTMLAnchorElement>(null)
	const [width, setWidth] = useState<number | null>(null)

	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	useEffect(() => {
		if (!containerRef.current) return

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (entry) {
				setWidth(entry.contentRect.width)
			}
		})

		observer.observe(containerRef.current)
		const padding = 8 // p-1
		setWidth(containerRef.current.clientWidth - padding)

		return () => observer.disconnect()
	}, [])

	const prefetchSeries = usePrefetchSeries()
	const prefetchSeriesBooks = usePrefetchSeriesBooks()

	const prefetch = useCallback(
		() => Promise.all([prefetchSeries(data.id), prefetchSeriesBooks(data.id)]),
		[prefetchSeries, prefetchSeriesBooks, data.id],
	)

	const thumbnailData = data.media.map((m) => m.thumbnail)
	const isMissing = data.status === 'MISSING'

	const layoutConfig = useMemo(() => {
		if (thumbnailData.length >= 3) return THREE_BOOK_LAYOUT
		if (thumbnailData.length === 2) return TWO_BOOK_LAYOUT
		if (thumbnailData.length === 1) return ONE_BOOK_LAYOUT
		return []
	}, [thumbnailData.length])

	const baseThumbnailWidth = width ? width * 0.7 : 0
	const baseThumbnailHeight = baseThumbnailWidth / thumbnailRatio

	const maxScale = Math.max(...layoutConfig.map((c) => c.scale), 1)
	const maxThumbnailHeight = baseThumbnailHeight * maxScale
	const stackHeight = maxThumbnailHeight

	const renderThumbnails = () => {
		if (width == null) return null

		return layoutConfig.map((config, index) => {
			const currentThumbnailData = thumbnailData[index]
			if (!currentThumbnailData) return null

			const currentThumbnailSize = {
				width: baseThumbnailWidth * config.scale,
				height: baseThumbnailHeight * config.scale,
			}

			const leftOffset = width * config.x - currentThumbnailSize.width / 2
			const heightDiff = maxThumbnailHeight - currentThumbnailSize.height

			const placeholderData = currentThumbnailData.metadata
				? {
						averageColor: currentThumbnailData.metadata.averageColor,
						colors: currentThumbnailData.metadata.colors,
						thumbhash: currentThumbnailData.metadata.thumbhash,
					}
				: undefined

			const isBackThumbnail = index > 0

			return (
				<div
					key={index}
					className="absolute will-change-transform"
					style={{
						zIndex: config.zIndex,
						left: leftOffset,
						top: heightDiff,
					}}
				>
					<ThumbnailImage
						src={currentThumbnailData.url}
						size={currentThumbnailSize}
						placeholderData={placeholderData}
						placeholderVariant="colorful"
						lazy={isBackThumbnail}
						borderAndShadowStyle={{
							shadowColor: 'rgba(0, 0, 0, 0.25)',
							shadowRadius: 3,
						}}
					/>
				</div>
			)
		})
	}

	return (
		<Link
			ref={containerRef}
			to={paths.seriesOverview(data.id)}
			onMouseEnter={prefetch}
			className={cn(
				'group flex w-full flex-col gap-2',
				'rounded-lg border border-transparent p-1 transition-colors duration-100',
				'hover:border-edge-brand focus-visible:border-edge-brand focus-visible:outline-none',
			)}
		>
			<div
				className="relative w-full"
				style={{ height: stackHeight > 0 ? stackHeight : undefined }}
			>
				{renderThumbnails()}
			</div>

			<div className="flex h-[52px] flex-col gap-0.5 px-0.5">
				<Text size="sm" className="line-clamp-2 font-medium leading-tight">
					{data.resolvedName}
				</Text>
				<Text size="xs" variant="muted">
					{isMissing ? (
						<span className="text-amber-500">Series Missing</span>
					) : (
						pluralizeStat('book', data.mediaCount)
					)}
				</Text>
			</div>
		</Link>
	)
})

export default StackedSeriesCard2
