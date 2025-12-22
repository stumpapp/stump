import { Button, cn, Heading, Text, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight, CircleSlash2 } from 'lucide-react'
import { forwardRef, ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { ScrollerProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { useInViewRef, useMediaMatch } from 'rooks'

import { usePreferences } from '../hooks'

type Props<T> = {
	title: string
	items: T[]
	renderItem: (item: T) => ReactNode
	keyExtractor: (item: T) => string
	onFetchMore?: () => void
	emptyState?: ReactNode
	cardHeight: number // Not including gaps/padding, component will calculate total height
	rowCount?: number | 'responsive'
	skipAmount?: number
}

export default function MultiRowHorizontalCardList<T>({
	title,
	items,
	renderItem,
	keyExtractor,
	onFetchMore,
	emptyState,
	cardHeight,
	rowCount: rowCountProp = 'responsive',
	skipAmount = 5,
}: Props<T>) {
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const isAtLeastLarge = useMediaMatch('(min-width: 1024px)')

	const rowCount = rowCountProp === 'responsive' ? (isAtLeastLarge ? 2 : 1) : rowCountProp

	const columns = useMemo(() => {
		const cols: T[][] = []
		for (let i = 0; i < items.length; i += rowCount) {
			cols.push(items.slice(i, i + rowCount))
		}
		return cols
	}, [items, rowCount])

	const containerHeight = useMemo(() => {
		const gap = 12
		const columnPaddingBottom = 4
		const scrollbarHeight = enableHideScrollbar ? 0 : 17
		return cardHeight * rowCount + gap * (rowCount - 1) + columnPaddingBottom + scrollbarHeight
	}, [cardHeight, rowCount, enableHideScrollbar])

	const [firstCardRef, firstCardIsInView] = useInViewRef({ threshold: 0.5 })
	const [lastCardRef, lastCardIsInView] = useInViewRef({ threshold: 0.5 })
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const { startIndex: lowerBound, endIndex: upperBound } = visibleRange

	const canSkipBackward = upperBound > 0 && !firstCardIsInView
	const canSkipForward = columns.length > 0 && !lastCardIsInView

	const handleSkipAhead = useCallback(
		(skip = skipAmount) => {
			const nextIndex = Math.min(upperBound + skip, columns.length - 1)
			virtuosoRef.current?.scrollIntoView({
				index: nextIndex,
				behavior: 'smooth',
				align: 'start',
			})
		},
		[upperBound, columns.length, skipAmount],
	)

	const handleSkipBackward = useCallback(
		(skip = skipAmount) => {
			const nextIndex = Math.max(lowerBound - skip, 0)
			virtuosoRef.current?.scrollIntoView({
				index: nextIndex,
				behavior: 'smooth',
				align: 'start',
			})
		},
		[lowerBound, skipAmount],
	)

	const renderContent = () => {
		if (!items.length) {
			return (
				<div className="flex">
					{emptyState || (
						<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
							<span className="rounded-lg border border-edge bg-background-surface p-2">
								<CircleSlash2 className="h-8 w-8 text-foreground-muted" />
							</span>
							<div>
								<Text>Nothing to show</Text>
								<Text size="sm" variant="muted">
									No results were returned
								</Text>
							</div>
						</div>
					)}
				</div>
			)
		}

		return (
			<Virtuoso
				ref={virtuosoRef}
				style={{ height: containerHeight }}
				horizontalDirection
				data={columns}
				components={{
					Scroller: HorizontalScroller,
				}}
				itemContent={(colIdx, column) => (
					<div
						{...(colIdx === 0
							? { ref: firstCardRef }
							: colIdx === columns.length - 1
								? { ref: lastCardRef }
								: {})}
						className="flex flex-col gap-3 px-1.5 pb-1"
					>
						{column.map((item) => (
							<div key={keyExtractor(item)}>{renderItem(item)}</div>
						))}
					</div>
				)}
				endReached={onFetchMore}
				increaseViewportBy={5 * cardHeight}
				rangeChanged={setVisibleRange}
				overscan={{ main: 3, reverse: 3 }}
			/>
		)
	}

	return (
		<div className="flex flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				<Heading size="sm">{title}</Heading>
				<div className={cn('self-end', { hidden: !items.length })}>
					<div className="flex gap-2">
						<ToolTip content="Seek backwards" isDisabled={!canSkipBackward} align="end">
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipBackward}
								onClick={() => handleSkipBackward()}
								onDoubleClick={() => handleSkipBackward(skipAmount * 3)}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</ToolTip>
						<ToolTip content="Seek Ahead" isDisabled={!canSkipForward} align="end">
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipForward}
								onClick={() => handleSkipAhead()}
								onDoubleClick={() => handleSkipAhead(skipAmount * 3)}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</ToolTip>
					</div>
				</div>
			</div>

			{renderContent()}
		</div>
	)
}

const HorizontalScroller = forwardRef<HTMLDivElement, ScrollerProps>(
	({ children, ...props }, ref) => {
		const {
			preferences: { enableHideScrollbar },
		} = usePreferences()

		return (
			<div
				className={cn('flex overflow-y-hidden', {
					'scrollbar-hide': enableHideScrollbar,
					'pb-[17px]': !enableHideScrollbar,
				})}
				ref={ref}
				{...props}
			>
				{children}
			</div>
		)
	},
)
HorizontalScroller.displayName = 'HorizontalScroller'
