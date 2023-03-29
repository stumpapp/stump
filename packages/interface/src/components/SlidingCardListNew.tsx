import { getMediaThumbnail } from '@stump/api'
import { EntityCard } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useCallback, useEffect, useRef } from 'react'

import MediaCard from './media/MediaCard'

// fixed cards: w-[10rem] sm:w-[10.666rem] md:w-[12rem] h-[21.333rem] sm:h-[22.666rem] md:h-[25.333rem]
// container: min-h-[26rem]
const SIZES = {}

type Props = {
	items: any[]
	fetchNext?: () => void
}
export default function HorizontalCardList({ items, fetchNext }: Props) {
	const parentRef = useRef<HTMLDivElement>(null)
	const visibleRef = useRef([0, 0])

	const columnVirtualizer = useVirtualizer({
		count: items.length,
		enableSmoothScroll: true,
		estimateSize: () => 160,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		overscan: 10,
		rangeExtractor: useCallback((range: Range) => {
			visibleRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	const virtualItems = columnVirtualizer.getVirtualItems()
	const isEmpty = virtualItems.length === 0

	// console.log('visibleRef', visibleRef.current)
	// console.log('count', virtualItems.length)
	// console.log('size', columnVirtualizer.getTotalSize())

	useEffect(() => {
		const [lastItem] = [...virtualItems].reverse()

		if (!lastItem) {
			return
		}

		const [, upperBound] = visibleRef.current

		const closeToEnd = upperBound && lastItem.index - upperBound <= 5

		// console.log('lastItem.index', lastItem.index)
		// console.log('upperBound', upperBound)
		// console.log('closeToEnd', closeToEnd)

		if (closeToEnd) {
			fetchNext?.()
		}
	}, [virtualItems, fetchNext])

	return (
		<div className="flex h-full w-full flex-col space-y-2">
			<div className="flex flex-row items-center justify-between"></div>
			<div ref={parentRef} className="h-[24rem] overflow-x-auto overflow-y-hidden scrollbar-hide">
				<div
					className="relative inline-flex h-full"
					style={{
						width: `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{columnVirtualizer.getVirtualItems().map((virtualItem) => {
						const media = items[virtualItem.index]

						// FIXME: translate needs to change according to match media
						return (
							<div
								key={virtualItem.key}
								style={{
									height: '100%',
									left: 0,
									position: 'absolute',
									top: 0,
									// I want a gap between the cards, but I don't want to add a margin to the cards
									transform: `translateX(calc(${virtualItem.start}px + ${
										virtualItem.index * 2.5
									}rem))`,
									width: `${virtualItem.size}px`,
								}}
							>
								<EntityCard
									title={media.name}
									href={`/media/${media.id}`}
									imageUrl={getMediaThumbnail(media.id)}
								/>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
