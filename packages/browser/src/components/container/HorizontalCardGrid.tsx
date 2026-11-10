import { cn } from '@stump/components'
import { ReactNode } from 'react'

import { useHorizontalScroll, usePreferences } from '@/hooks'

import { CardListEmptyState } from './CardListEmptyState'
import { CardListHeader } from './CardListHeader'
import { CARD_HORIZONTAL_PADDING, CARD_ROW_GAP, useFittedColumns } from './useFittedColumns'

const MIN_FIT_WIDTH_RATIO = 0.9
const MAX_FIT_WIDTH_RATIO = 1.25

type Props<T> = {
	title: ReactNode
	items: T[]
	renderItem: (item: T, cardWidth: number) => ReactNode
	keyExtractor: (item: T) => string
	cardWidth: number
	/** let cards grow or shrink a little so the row uses the available width */
	fitToWidth?: boolean
	/** the max num of rows, not fixed, fewer are used when everything fits */
	maxRows?: number
	emptyState?: ReactNode
}

export function HorizontalCardGrid<T>({
	title,
	items,
	renderItem,
	keyExtractor,
	cardWidth,
	fitToWidth = false,
	maxRows = 2,
	emptyState,
}: Props<T>) {
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()
	const { scrollerRef, canSkipBackward, canSkipForward, handleSkipBackward, handleSkipAhead } =
		useHorizontalScroll()
	const { containerRef, containerWidth, columnsThatFit } = useFittedColumns(cardWidth)

	const requiredColumns = Math.ceil(items.length / maxRows)
	const fixedPerRow = Math.max(1, columnsThatFit, requiredColumns)

	// round to whichever column count keeps the card size closest to its usual size, then distribute
	// the avail width evenly
	const fittedColumns = Math.max(
		1,
		Math.round(containerWidth / (cardWidth + CARD_HORIZONTAL_PADDING)),
		requiredColumns,
	)
	const fittedWidth = Math.floor(containerWidth / fittedColumns - CARD_HORIZONTAL_PADDING)
	const fallbackFittedWidth = Math.floor(containerWidth / fixedPerRow - CARD_HORIZONTAL_PADDING)

	const canFitWidth = (width: number) =>
		width >= cardWidth * MIN_FIT_WIDTH_RATIO && width <= cardWidth * MAX_FIT_WIDTH_RATIO

	const canUseRoundedColumns = canFitWidth(fittedWidth)
	const canUseFallbackColumns = canFitWidth(fallbackFittedWidth)
	const canFitToWidth =
		fitToWidth && containerWidth > 0 && (canUseRoundedColumns || canUseFallbackColumns)

	const perRow = canFitToWidth && canUseRoundedColumns ? fittedColumns : fixedPerRow
	const resolvedWidth = canFitToWidth
		? canUseRoundedColumns
			? fittedWidth
			: fallbackFittedWidth
		: cardWidth

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
				<div
					ref={scrollerRef}
					className={cn('min-w-0 overflow-x-auto overflow-y-hidden', {
						'scrollbar-hide': enableHideScrollbar,
					})}
				>
					<div
						className="pb-1 grid w-max"
						style={{
							gridTemplateColumns: `repeat(${perRow}, ${resolvedWidth + CARD_HORIZONTAL_PADDING}px)`,
							rowGap: CARD_ROW_GAP,
						}}
					>
						{items.map((item) => (
							<div key={keyExtractor(item)} className="px-1.5">
								{renderItem(item, resolvedWidth)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
