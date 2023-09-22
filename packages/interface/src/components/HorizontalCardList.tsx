import { cx, Heading, IconButton, Text, ToolTip } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useMediaMatch } from 'rooks'

type Props = {
	cards: JSX.Element[]
	title?: string
	hasMore?: boolean
	fetchNext?: () => void
	emptyMessage?: string | (() => React.ReactNode)
}
export default function HorizontalCardList({
	cards,
	title,
	fetchNext,
	emptyMessage = 'No items to display',
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null)
	const visibleRef = useRef([0, 0])

	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	// NOTE: "When this function's memoization changes, the entire list is recalculated"
	// Sure doesn't seem like it! >:( I had to create an effect that calls measure() when the
	// memoization changes. This feels like a bug TBH.
	const estimateSize = useCallback(() => {
		if (!isAtLeastSmall) {
			return 170
		} else if (!isAtLeastMedium) {
			return 185
		} else {
			return 205
		}
	}, [isAtLeastSmall, isAtLeastMedium])

	const columnVirtualizer = useVirtualizer({
		count: cards.length,
		enableSmoothScroll: true,
		estimateSize,
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
	const canSkipForward = !!cards.length && (upperBound || 0) + 1 < cards.length

	useEffect(
		() => {
			columnVirtualizer.measure()
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isAtLeastMedium, isAtLeastSmall],
	)

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

	const getItemOffset = (index: number) => {
		return index * estimateSize()
	}

	const handleSkipAhead = async (skipValue = 5) => {
		const nextIndex = (upperBound || 5) + skipValue || 10
		const virtualItem = virtualItems.find((item) => item.index === nextIndex)

		if (!virtualItem) {
			// NOTE: this is really just a guess, and this should never ~really~ happen
			columnVirtualizer.scrollToOffset(getItemOffset(nextIndex), { smoothScroll: true })
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

	const renderContent = () => {
		if (!cards.length) {
			return typeof emptyMessage === 'string' ? (
				<Text size="md">{emptyMessage}</Text>
			) : (
				emptyMessage()
			)
		}

		return (
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
									transform: `translateX(${virtualItem.start}px)`,
									width: `${estimateSize()}px`,
								}}
							>
								{card}
							</div>
						)
					})}
				</div>
			</div>
		)
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
			{renderContent()}
		</div>
	)
}
