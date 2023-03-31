import { cx, Heading, IconButton, ToolTip } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useMediaMatch } from 'rooks'
// import { useMediaMatch } from 'rooks'

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
		overscan: 10,
		rangeExtractor: useCallback((range: Range) => {
			visibleRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	const virtualItems = columnVirtualizer.getVirtualItems()
	const isEmpty = virtualItems.length === 0

	// FIXME: this bound is straight up wrong
	const [lowerBound, upperBound] = visibleRef.current

	const canSkipBackward = (lowerBound ?? 0) > 0
	// TODO: this is likely wrong since it doesnt factor hasMore
	const canSkipForward = !!cards.length && (upperBound ?? 0) < cards.length - 1

	// console.log('cards.length', cards.length)
	// console.log('virtualItems.length', virtualItems.length)
	// console.log('lowerBound', lowerBound)
	// console.log('canSkipBackward', canSkipBackward)
	// console.log('upperBound', upperBound)
	// console.log('canSkipForward', canSkipForward)

	useEffect(() => {
		const [lastItem] = [...virtualItems].reverse()
		if (!lastItem) {
			return
		}

		const closeToEnd = upperBound && lastItem.index - upperBound <= 5
		if (closeToEnd) {
			fetchNext?.()
		}
	}, [virtualItems, fetchNext, upperBound])

	const getItemOffset = (index: number) => {
		if (isMobile) {
			return index * 0.75
		} else if (isAtLeastMedium) {
			return index * 2.5
		} else {
			return index * 2
		}
	}

	const handleSkipAhead = (skipValue = 5) => {
		const nextIndex = (upperBound ?? 5) + skipValue || 10
		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true })
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
						width: `${columnVirtualizer.getTotalSize()}px`,
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
