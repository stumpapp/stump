import { Button, cn, Heading, Text, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight, CircleSlash2 } from 'lucide-react'
import { forwardRef, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ScrollerProps, Virtuoso } from 'react-virtuoso'
import { useMediaMatch } from 'rooks'

import { useTranslate } from '@/hooks/useTranslate'

import { useHorizontalScroll, usePreferences } from '../hooks'

// px-1.5 on each column
const COLUMN_HORIZONTAL_PADDING = 12

type Props<T> = {
	title: ReactNode
	items: T[]
	renderItem: (item: T, cardWidth: number) => ReactNode
	keyExtractor: (item: T) => string
	onFetchMore?: () => void
	emptyState?: ReactNode
	cardHeight: number // Not including gaps/padding, component will calculate total height
	cardWidth: number
	/* the max num of rows, not fixed */
	rowCount?: number | 'responsive'
}
// TODO: just remove `responsive` since that's kinda just how it behaves now

export default function MultiRowHorizontalCardList<T>({
	title,
	items,
	renderItem,
	keyExtractor,
	onFetchMore,
	emptyState,
	cardHeight,
	cardWidth,
	rowCount: rowCountProp = 'responsive',
}: Props<T>) {
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()
	const { t } = useTranslate()
	const { scrollerRef, canSkipBackward, canSkipForward, handleSkipBackward, handleSkipAhead } =
		useHorizontalScroll()

	const isAtLeastLarge = useMediaMatch('(min-width: 1024px)')
	const containerRef = useRef<HTMLDivElement>(null)
	const [containerWidth, setContainerWidth] = useState(0)

	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container) return

		const updateWidth = () => setContainerWidth(container.clientWidth)
		const observer = new ResizeObserver(updateWidth)
		observer.observe(container)
		updateWidth()

		return () => observer.disconnect()
	}, [])

	const maxRowCount = rowCountProp === 'responsive' ? (isAtLeastLarge ? 2 : 1) : rowCountProp
	// we want to make sure cards don't change their size because e.g. the simple book card i want
	// to be a smaller variant. so insteead of shrinking/growing to fit we have to be more mathematical
	// about how many fit in space to do synthetic wraps
	const columnsThatFit = Math.max(
		1,
		Math.floor(containerWidth / (cardWidth + COLUMN_HORIZONTAL_PADDING)),
	)
	const rowsNeeded = Math.ceil(items.length / columnsThatFit)
	const fitsWithoutScroll = containerWidth > 0 && rowsNeeded <= maxRowCount
	const rowCount = Math.max(1, Math.min(maxRowCount, rowsNeeded))

	// if it fits without scroll we likely don't even need to fetch more, however if there
	// is something i am not considering then this would be an annoying bug
	useEffect(() => {
		if (fitsWithoutScroll) onFetchMore?.()
	}, [fitsWithoutScroll, onFetchMore])

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

	const renderContent = () => {
		if (!items.length) {
			// TODO(owl): mini empty owl?
			return (
				<div className="flex">
					{emptyState || (
						<div className="space-x-3 px-4 py-4 flex items-start justify-start rounded-lg border border-dashed border-border">
							<span className="p-2 rounded-lg border border-border bg-muted">
								<CircleSlash2 className="h-8 w-8 text-muted-foreground" />
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

		if (fitsWithoutScroll) {
			return (
				<div className="gap-y-3 pb-1 flex flex-wrap">
					{items.map((item) => (
						<div key={keyExtractor(item)} className="px-1.5">
							{renderItem(item, cardWidth)}
						</div>
					))}
				</div>
			)
		}

		return (
			<Virtuoso
				scrollerRef={scrollerRef}
				style={{ height: containerHeight }}
				horizontalDirection
				data={columns}
				components={{
					Scroller: HorizontalScroller,
				}}
				itemContent={(_, column) => (
					<div className="gap-3 px-1.5 pb-1 flex flex-col">
						{column.map((item) => (
							<div key={keyExtractor(item)}>{renderItem(item, cardWidth)}</div>
						))}
					</div>
				)}
				endReached={onFetchMore}
				increaseViewportBy={5 * cardHeight}
				overscan={{ main: 3, reverse: 3 }}
			/>
		)
	}

	return (
		<div ref={containerRef} className="space-y-2 flex flex-col">
			<div className="flex flex-row items-center justify-between">
				{typeof title === 'string' ? <Heading size="sm">{title}</Heading> : title}
				<div
					className={cn('self-end', {
						hidden: !items.length || fitsWithoutScroll || (!canSkipBackward && !canSkipForward),
					})}
				>
					<div className="gap-2 flex">
						<ToolTip
							content={t('slidingList.buttons.previous')}
							isDisabled={!canSkipBackward}
							align="end"
						>
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipBackward}
								onClick={handleSkipBackward}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</ToolTip>
						<ToolTip
							content={t('slidingList.buttons.next')}
							isDisabled={!canSkipForward}
							align="end"
						>
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipForward}
								onClick={handleSkipAhead}
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
					'pb-4.25': !enableHideScrollbar,
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
