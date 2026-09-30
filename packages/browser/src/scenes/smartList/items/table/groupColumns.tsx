import { cn, Text } from '@stump/components'
import { SmartListGroupedItem, SmartListViewColumn } from '@stump/graphql'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'

type EntityGroup = SmartListGroupedItem
const columnHelper = createColumnHelper<EntityGroup>()

const buildNameColumn = (isGroupedBySeries: boolean, standaloneLabel: string) =>
	columnHelper.accessor(({ entity }) => entity?.name ?? standaloneLabel, {
		cell: ({ getValue, row: { getToggleExpandedHandler, getIsExpanded, getCanExpand } }) => {
			const isExpanded = getIsExpanded()

			return (
				<button
					title={isExpanded ? 'Collapse' : 'Expand'}
					className="gap-x-1 flex items-center"
					onClick={getToggleExpandedHandler()}
					disabled={!getCanExpand()}
				>
					<ChevronDown
						className={cn(
							'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
							{
								'rotate-180': isExpanded,
							},
						)}
					/>
					<Text className="text-sm md:text-base line-clamp-1 text-left">{getValue()}</Text>
				</button>
			)
		},
		enableGlobalFilter: true,
		enableSorting: true,
		header: ({ table: { getToggleAllRowsExpandedHandler, getIsAllRowsExpanded } }) => {
			const isAllRowsExpanded = getIsAllRowsExpanded()

			return (
				<div className="gap-x-1 flex items-center">
					<button
						onClick={(e) => {
							// Don't update the sorting state when clicking the expand all button
							e.stopPropagation()
							const handler = getToggleAllRowsExpandedHandler()
							handler(e)
						}}
						title={isAllRowsExpanded ? 'Collapse all' : 'Expand all'}
					>
						<ChevronDown
							className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', {
								'rotate-180': isAllRowsExpanded,
							})}
						/>
					</button>
					<Text className="text-sm" variant="muted">
						{isGroupedBySeries ? 'Series' : 'Library'}
					</Text>
				</div>
			)
		},
		id: 'name',
	})

const booksCountColumn = columnHelper.accessor(({ books }) => books.length, {
	cell: ({
		row: {
			original: { books },
		},
	}) => (
		<Text size="sm" variant="muted">
			{books.length}
		</Text>
	),
	enableGlobalFilter: true,
	enableSorting: true,
	header: () => (
		<Text size="sm" className="text-left" variant="muted">
			Books
		</Text>
	),
	id: 'books',
})

const staticColumnMap = {
	books: booksCountColumn,
} as Record<string, ColumnDef<EntityGroup>>

export const getColumnMap = (isGroupedBySeries: boolean, standaloneLabel: string) =>
	({
		...staticColumnMap,
		name: buildNameColumn(isGroupedBySeries, standaloneLabel),
	}) as Record<string, ColumnDef<EntityGroup>>

const staticColumnOptionMap: Record<keyof typeof staticColumnMap, string> = {
	books: 'Books',
}

export const getColumnOptionMap = (isGroupedBySeries: boolean) =>
	({
		name: `Name (${isGroupedBySeries ? 'series' : 'library'})`,
		...staticColumnOptionMap,
	}) as Record<string, string>

export const buildColumns = (
	isGroupedBySeries: boolean,
	columns?: SmartListViewColumn[],
	standaloneLabel = 'Standalone books',
) => {
	if (!columns?.length) {
		return [
			buildNameColumn(isGroupedBySeries, standaloneLabel),
			booksCountColumn,
		] as ColumnDef<EntityGroup>[]
	}

	const sortedColumns = columns.sort((a, b) => a.position - b.position)
	const selectedColumnIds = sortedColumns.map(({ id }) => id)

	const columnMap = getColumnMap(isGroupedBySeries, standaloneLabel)

	return selectedColumnIds.map((id) => columnMap[id]).filter(Boolean) as ColumnDef<EntityGroup>[]
}
