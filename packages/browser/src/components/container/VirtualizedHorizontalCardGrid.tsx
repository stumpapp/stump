import { cn } from '@stump/components'
import { forwardRef, ReactNode, useMemo } from 'react'
import { ScrollerProps, Virtuoso } from 'react-virtuoso'

import { useHorizontalScroll, usePreferences } from '@/hooks'

import { CardListEmptyState } from './CardListEmptyState'
import { CardListHeader } from './CardListHeader'
import { CARD_ROW_GAP, useFittedColumns } from './useFittedColumns'

type Props<T> = {
	title: ReactNode
	items: T[]
	renderItem: (item: T, cardWidth: number) => ReactNode
	keyExtractor: (item: T) => string
	cardWidth: number
	/** not including gaps/padding, used to size the virtualized viewport */
	cardHeight: number
	/** the max num of rows, not fixed, fewer are used when everything fits */
	maxRows?: number
	onFetchMore: () => void
	emptyState?: ReactNode
}

export function VirtualizedHorizontalCardGrid<T>({
	title,
	items,
	renderItem,
	keyExtractor,
	cardWidth,
	cardHeight,
	maxRows = 2,
	onFetchMore,
	emptyState,
}: Props<T>) {
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()
	const { scrollerRef, canSkipBackward, canSkipForward, handleSkipBackward, handleSkipAhead } =
		useHorizontalScroll()
	const { containerRef, columnsThatFit } = useFittedColumns(cardWidth)

	const rowCount = Math.max(1, Math.min(maxRows, Math.ceil(items.length / columnsThatFit)))

	const columns = useMemo(() => {
		const cols: T[][] = []
		for (let i = 0; i < items.length; i += rowCount) {
			cols.push(items.slice(i, i + rowCount))
		}
		return cols
	}, [items, rowCount])

	const scrollbarHeight = enableHideScrollbar ? 0 : 17
	const columnPaddingBottom = 4
	const height =
		cardHeight * rowCount + CARD_ROW_GAP * (rowCount - 1) + columnPaddingBottom + scrollbarHeight

	return (
		<div ref={containerRef} className="space-y-2 flex flex-col">
			<CardListHeader
				title={title}
				canSkipBackward={canSkipBackward}
				canSkipForward={canSkipForward}
				onSkipBackward={handleSkipBackward}
				onSkipAhead={handleSkipAhead}
			/>

			{!items.length ? (
				(emptyState ?? <CardListEmptyState />)
			) : (
				<Virtuoso
					scrollerRef={scrollerRef}
					style={{ height }}
					horizontalDirection
					data={columns}
					components={{ Scroller: HorizontalScroller }}
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
			)}
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
