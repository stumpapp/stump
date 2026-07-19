import { LibrarySeriesQuery } from '@stump/graphql'
import { memo, useEffect, useRef, useState } from 'react'

import { StackedSeriesCard } from '@/components/series'

import pluralizeStat from '../../utils/pluralize'

export type LibrarySeriesCardData = LibrarySeriesQuery['series']['nodes'][number]

type Props = {
	data: LibrarySeriesCardData
}

const LibrarySeriesCard = memo(function LibrarySeriesCard({ data }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
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

	const thumbnailData = [data.thumbnail, ...data.media.map((m) => m.thumbnail)]

	return (
		<div ref={containerRef}>
			{width != null && (
				<StackedSeriesCard
					id={data.id}
					name={data.resolvedName}
					subtitle={pluralizeStat('book', data.mediaCount)}
					isMissing={data.status === 'MISSING'}
					width={width}
					thumbnailData={thumbnailData}
				/>
			)}
		</div>
	)
})

export default LibrarySeriesCard
