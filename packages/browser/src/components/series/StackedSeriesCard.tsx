import { Text } from '@stump/components'
import { LibrarySeriesQuery } from '@stump/graphql'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { Link } from '@/context'
import { usePaths } from '@/paths'
import { usePrefetchSeries } from '@/scenes/series'
import { usePrefetchSeriesBooks } from '@/scenes/series/tabs/books/SeriesBooksScene'

import pluralizeStat from '../../utils/pluralize'
import { SeriesStackedThumbnails } from '../thumbnail'

export type StackedSeriesCardData = LibrarySeriesQuery['series']['nodes'][number]

type Props = {
	data: StackedSeriesCardData
}

const StackedSeriesCard = memo(function StackedSeriesCard({ data }: Props) {
	const paths = usePaths()
	const containerRef = useRef<HTMLAnchorElement>(null)
	const [width, setWidth] = useState<number | null>(null)

	// The cards in the traversal bits of the web app are resizable (to an extent), and so providing
	// a width to the stacked thumb component is a bit annoying. This should DEFINITELY be rethought, though,
	// because a resize observer for every card is probably not great for performance. Part of the problem
	// is that I mostly just copy/pasted the stacked series layouts but should maybe try positioning them with
	// css and percentages instead
	useEffect(() => {
		if (!containerRef.current) return

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (entry) {
				setWidth(entry.contentRect.width)
			}
		})

		observer.observe(containerRef.current)
		setWidth(containerRef.current.offsetWidth)

		return () => observer.disconnect()
	}, [])

	const prefetchSeries = usePrefetchSeries()
	const prefetchSeriesBooks = usePrefetchSeriesBooks()

	const prefetch = useCallback(
		() => Promise.all([prefetchSeries(data.id), prefetchSeriesBooks(data.id)]),
		[prefetchSeries, prefetchSeriesBooks, data.id],
	)

	const thumbnailData = [data.thumbnail, ...data.media.map((m) => m.thumbnail)]
	const isMissing = data.status === 'MISSING'

	return (
		<Link
			ref={containerRef}
			to={paths.seriesOverview(data.id)}
			className="group relative block w-full"
			onMouseEnter={prefetch}
		>
			{width != null && <SeriesStackedThumbnails width={width} thumbnailData={thumbnailData} />}

			<div className="absolute left-0 top-0 z-20 w-full px-2.5 py-3">
				<Text
					className="line-clamp-2 !text-wrap text-base font-bold leading-tight text-white md:text-lg"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{data.resolvedName}
				</Text>
				<Text
					className="mt-0.5 line-clamp-1 text-xs font-medium leading-tight text-gray-200 md:text-sm"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
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

export default StackedSeriesCard
