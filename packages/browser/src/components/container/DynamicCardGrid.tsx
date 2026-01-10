import { forwardRef, memo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { GridItemProps, GridListProps, VirtuosoGrid } from 'react-virtuoso'

import { GRID_GAP, sizeToPercentageWidth, useGridSize } from './useGridSize'

type Props = {
	count: number
	renderItem: (index: number) => React.ReactNode
}

function DynamicCardGrid({ count, renderItem }: Props) {
	const { columns } = useGridSize()
	return (
		<div
			data-testid="dynamic-card-grid"
			style={{
				gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
			}}
			className="grid flex-1 auto-rows-max items-start justify-center gap-2 py-2 md:justify-start"
		>
			{Array.from({ length: count }).map((_, index) => renderItem(index))}
		</div>
	)
}
export default memo(DynamicCardGrid)

type VirtualizedProps = Props & {
	onEndReached?: () => void
}

export const VirtualizedCardGrid = ({ count, renderItem, onEndReached }: VirtualizedProps) => (
	<AutoSizer>
		{({ height, width }) => (
			<VirtuosoGrid
				style={{ height, width }}
				totalCount={count}
				components={{
					List,
					Item,
				}}
				itemContent={(index) => renderItem(index)}
				endReached={onEndReached}
				increaseViewportBy={5 * (320 / 3)}
			/>
		)}
	</AutoSizer>
)

const List = forwardRef<HTMLDivElement, GridListProps>(({ style, children, ...props }, ref) => (
	<div
		ref={ref}
		{...props}
		style={{
			display: 'flex',
			flexWrap: 'wrap',
			columnGap: GRID_GAP,
			...style,
		}}
	>
		{children}
	</div>
))
List.displayName = 'List'

const Item = forwardRef<HTMLDivElement, GridItemProps>(({ style, children, ...props }, ref) => {
	const { columns } = useGridSize()

	return (
		<div
			ref={ref}
			{...props}
			style={{
				width: sizeToPercentageWidth[columns],
				display: 'flex',
				flex: 'none',
				alignContent: 'stretch',
				boxSizing: 'border-box',
				paddingBottom: GRID_GAP,
				...style,
			}}
		>
			{children}
		</div>
	)
})
Item.displayName = 'Item'
