import { Heading, IconButton, Text, ToolTip } from '@stump/components'
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

interface Props {
	title?: string
	emptyMessage?: string
	cards: JSX.Element[]
	onScrollEnd?: () => void
	isLoadingNext?: boolean
	hasNext?: boolean
	hideIfEmpty?: boolean
}

export default function SlidingCardList({
	cards,
	onScrollEnd,
	isLoadingNext,
	hasNext,
	title,
	emptyMessage,
	hideIfEmpty,
}: Props) {
	const parentRef = useRef<HTMLDivElement>(null)
	const visibleRef = useRef([0, 0])
	const columnVirtualizer = useVirtualizer({
		count: cards.length,
		enableSmoothScroll: true,
		estimateSize: () => 350,

		getScrollElement: () => parentRef.current,

		horizontal: true,
		// FIXME: this is an absurd overscan... needs to change, however I cannot get it to work with less
		overscan: 75,
		rangeExtractor: useCallback((range: Range) => {
			visibleRef.current = [range.startIndex, range.endIndex]
			return defaultRangeExtractor(range)
		}, []),
	})

	useEffect(
		() => {
			const [lastItem] = [...columnVirtualizer.getVirtualItems()].reverse()

			if (!lastItem) {
				return
			}

			if (lastItem.index >= cards.length - 5 && hasNext && !isLoadingNext) {
				onScrollEnd?.()
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[hasNext, onScrollEnd, cards.length, isLoadingNext, columnVirtualizer.getVirtualItems().length],
	)

	const handleSkipAhead = (skipValue = 5) => {
		let nextIndex = (visibleRef.current[1] ?? 5) + skipValue || 10

		if (nextIndex > columnVirtualizer.getVirtualItems().length - 1) {
			nextIndex = columnVirtualizer.getVirtualItems().length - 1
		}

		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true })
	}

	const handleSkipBackward = (skipValue = 5) => {
		let nextIndex = (visibleRef?.current[0] ?? 0) - skipValue || 0

		if (nextIndex < 0) {
			nextIndex = 0
		}

		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true })
	}

	const [lowerBound, upperBound] = visibleRef.current
	const canSkipBackward = (lowerBound ?? 0) > 0
	const canSkipForward = (upperBound ?? 0) > 0 && (upperBound ?? 0) * 2 < cards.length

	const virtualItems = columnVirtualizer.getVirtualItems()
	const isEmpty = virtualItems.length === 0

	const renderVirtualItems = () => {
		if (isEmpty) {
			return <Text>{emptyMessage || 'No items available'}</Text>
		} else {
			return columnVirtualizer.getVirtualItems().map((virtualItem) => {
				return cards[virtualItem.index]
			})
		}
	}

	if (hideIfEmpty && isEmpty) {
		return null
	}

	return (
		<div className="flex w-full flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				{title && <Heading size="sm">{title}</Heading>}
				<div className={clsx('self-end', { hidden: isEmpty })}>
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
			<div
				className="flex w-full flex-row space-x-2 overflow-x-scroll pb-4 scrollbar-hide"
				ref={parentRef}
			>
				<div
					className="relative flex w-full flex-row space-x-2"
					style={{
						width: isEmpty ? '100%' : `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{renderVirtualItems()}
				</div>
			</div>
		</div>
	)
}
