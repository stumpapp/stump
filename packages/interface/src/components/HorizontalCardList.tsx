import { cx, Heading, IconButton, ToolTip } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useMediaMatch } from 'rooks'

// fixed cards: w-[10rem] sm:w-[10.666rem] md:w-[12rem] h-[21.333rem] sm:h-[22.666rem] md:h-[25.333rem]
// container: min-h-[26rem]

type Props = {
	cards: JSX.Element[]
	title?: string
	hasMore?: boolean
	fetchNext?: () => void
}
export default function HorizontalCardList({ cards, title, fetchNext }: Props) {
	const parentRef = useRef<HTMLDivElement>(null)
	const visibleRef = useRef([0, 0])

	const isMobile = useMediaMatch('(max-width: 768px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const columnVirtualizer = useVirtualizer({
		count: cards.length,
		enableSmoothScroll: true,
		estimateSize: () => 160,
		getScrollElement: () => parentRef.current,
		horizontal: true,
		overscan: 15,
		rangeExtractor: useCallback((range: Range) => {
			visibleRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	const virtualItems = columnVirtualizer.getVirtualItems()
	const isEmpty = virtualItems.length === 0

	const [lowerBound, upperBound] = visibleRef.current

	const canSkipBackward = (lowerBound ?? 0) > 0
	const canSkipForward = !!cards.length && (upperBound || 0) <= cards.length

	useEffect(() => {
		const [lastItem] = [...virtualItems].reverse()
		if (!lastItem) {
			return
		}

		// if we are 80% of the way to the end, fetch more
		const start = upperBound || 0
		const threshold = lastItem.index * 0.8
		const closeToEnd = start >= threshold

		if (closeToEnd) {
			fetchNext?.()
		}
	}, [virtualItems, fetchNext, upperBound])

	// based on the number of cards, and how we calculate the offset, we need to know
	// how much total offset is added for each index.
	const getTotalOffsetAmount = () => {
		if (isMobile) {
			// 0.75rem per card
			return cards.length * 0.75
		} else if (isAtLeastMedium) {
			// 2.5rem per card
			return cards.length * 2.5
		} else {
			// 2rem per card
			return cards.length * 2
		}
	}

	const getItemOffset = (index: number) => {
		if (isMobile) {
			return index * 0.75
		} else if (isAtLeastMedium) {
			return index * 2.5
		} else {
			return index * 2
		}
	}

	const handleSkipAhead = async (skipValue = 5) => {
		const nextIndex = (upperBound || 5) + skipValue || 10
		const virtualItem = virtualItems.find((item) => item.index === nextIndex)

		// FIXME: this doesn't work :sob: it breaks on *really* long lists
		// This is sort of a hack. Sometimes, the virtual list thinks its at the end, but
		// really a few items are still hidden off screen. When this happens, I am assuming that
		// means we are at the end of this section, and we can just scroll to the edge of the list,
		// considering both the gap offsets and just a little extra padding.
		if (!virtualItem) {
			if (cards.length < 50) {
				columnVirtualizer.scrollToOffset(
					columnVirtualizer.getTotalSize() + getItemOffset(nextIndex) + 500,
					{ smoothScroll: true },
				)
			}
		} else {
			columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true })
		}
	}

	const handleSkipBackward = (skipValue = 5) => {
		let nextIndex = (visibleRef?.current[0] ?? 0) - skipValue || 0
		if (nextIndex < 0) {
			nextIndex = 0
		}

		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true })
	}

	return (
		<div className="flex h-full w-full flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				<Heading size="sm">{title}</Heading>
				<div className={cx('self-end', { hidden: isEmpty })}>
					<div className="flex gap-2">
						<ToolTip content="Seek backwards" isDisabled={!canSkipBackward}>
							<IconButton
								variant="ghost"
								size="sm"
								disabled={!canSkipBackward}
								onClick={() => handleSkipBackward()}
								onDoubleClick={() => handleSkipBackward(20)}
							>
								<ChevronLeft className="h-4 w-4" />
							</IconButton>
						</ToolTip>
						<ToolTip content="Seek Ahead" isDisabled={!canSkipForward}>
							<IconButton
								variant="ghost"
								size="sm"
								disabled={!canSkipForward}
								onClick={() => handleSkipAhead()}
								onDoubleClick={() => handleSkipAhead(20)}
							>
								<ChevronRight className="h-4 w-4" />
							</IconButton>
						</ToolTip>
					</div>
				</div>
			</div>
			<div ref={parentRef} className="h-[24rem] overflow-x-auto overflow-y-hidden scrollbar-hide">
				<div
					className="relative inline-flex h-full"
					style={{
						width: `calc(${columnVirtualizer.getTotalSize()}px + ${getTotalOffsetAmount()}rem)`,
					}}
				>
					{columnVirtualizer.getVirtualItems().map((virtualItem) => {
						const card = cards[virtualItem.index]

						return (
							<div
								key={virtualItem.key}
								style={{
									height: '100%',
									left: 0,
									position: 'absolute',
									top: 0,
									transform: `translateX(calc(${virtualItem.start}px + ${getItemOffset(
										virtualItem.index,
									)}rem))`,
									width: `${virtualItem.size}px`,
								}}
							>
								{card}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
