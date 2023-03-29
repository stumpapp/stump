import { getMediaThumbnail } from '@stump/api'
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

	useEffect(
		() => {
			const [lastItem] = [...virtualItems].reverse()

			if (!lastItem) {
				return
			}

			const [_, upperBound] = visibleRef.current

			const closeToEnd = upperBound && lastItem.index - upperBound <= 5

			// console.log('lastItem.index', lastItem.index)
			// console.log('upperBound', upperBound)
			// console.log('closeToEnd', closeToEnd)

			if (closeToEnd) {
				fetchNext?.()
			}

			// if (lastItem.index >= (upperBound || 0 - 8)) {
			// 	fetchNext?.()
			// }

			// if (lastItem.index >= cards.length - 5 && hasNext && !isLoadingNext) {
			// 	onScrollEnd?.()
			// }
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[virtualItems],
	)

	return (
		<div className="flex h-full w-full flex-col space-y-2">
			<div className="flex flex-row items-center justify-between"></div>
			<div ref={parentRef} className="h-[21.3rem] overflow-x-auto pb-4 scrollbar-hide">
				<div
					className="relative inline-flex h-full"
					style={{
						width: `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{columnVirtualizer.getVirtualItems().map((virtualItem) => {
						const media = items[virtualItem.index]

						return (
							<div
								key={virtualItem.key}
								style={{
									height: '100%',
									left: 0,
									position: 'absolute',
									top: 0,
									transform: `translateX(${virtualItem.start}px)`,
									width: `${virtualItem.size}px`,
								}}
							>
								<MediaCard media={media} fixed />
								{/* {items[virtualItem.index]} */}

								{/* <div
									className="relative aspect-[2/3] bg-cover bg-center p-0"
									style={{
										// TODO: figure out how to do fallback ONLY on error... url('/assets/fallbacks/image-file.svg')
										backgroundImage: `url('${getMediaThumbnail(media.id)}')`,
									}}
								/> */}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

{
	/* <div
className="relative inline-flex h-full"
style={{
	width: `${columnVirtualizer.getTotalSize()}px`,
}}
>
{columnVirtualizer.getVirtualItems().map((virtualItem) => (
	<div
		className="h-full"
		key={virtualItem.key}
		ref={(el) => {
			virtualItem.measureElement(el)
		}}
		style={{
			bottom: 0,
			left: 0,
			position: 'absolute',
			top: 0,
			transform: `translateX(${virtualItem.start}px)`,
		}}
	>
		{items[virtualItem.index]}
	</div>
))}
</div> */
}
