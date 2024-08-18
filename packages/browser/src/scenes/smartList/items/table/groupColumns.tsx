import { cn, Text } from '@stump/components'
import { Library, ReactTableColumnSort, Series, SmartListItemGroup } from '@stump/types'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'

type EntityGroup = SmartListItemGroup<Series> | SmartListItemGroup<Library>
const columnHelper = createColumnHelper<EntityGroup>()

const buildNameColumn = (isGroupedBySeries: boolean) =>
	columnHelper.accessor('entity.name', {
		cell: ({
			row: {
				original: {
					entity: { name },
				},
				getToggleExpandedHandler,
				getIsExpanded,
				getCanExpand,
			},
		}) => {
			const isExpanded = getIsExpanded()

			return (
				<button
					title={isExpanded ? 'Collapse' : 'Expand'}
					className="flex items-center gap-x-1"
					onClick={getToggleExpandedHandler()}
					disabled={!getCanExpand()}
				>
					<ChevronDown
						className={cn('h-4 w-4 text-foreground-muted transition-transform duration-200', {
							'rotate-180': isExpanded,
						})}
					/>
					<Text className="line-clamp-1 text-left text-sm md:text-base">{name}</Text>
				</button>
			)
		},
		enableGlobalFilter: true,
		enableSorting: true,
		header: ({ table: { getToggleAllRowsExpandedHandler, getIsAllRowsExpanded } }) => {
			const isAllRowsExpanded = getIsAllRowsExpanded()

			return (
				<div className="flex items-center gap-x-1">
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
							className={cn('h-4 w-4 text-foreground-muted transition-transform duration-200', {
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

export const getColumnMap = (isGroupedBySeries: boolean) =>
	({
		...staticColumnMap,
		name: buildNameColumn(isGroupedBySeries),
	}) as Record<string, ColumnDef<EntityGroup>>

const staticColumnOptionMap: Record<keyof typeof staticColumnMap, string> = {
	books: 'Books',
}

export const getColumnOptionMap = (isGroupedBySeries: boolean) =>
	({
		name: `Name (${isGroupedBySeries ? 'series' : 'library'})`,
		...staticColumnOptionMap,
	}) as Record<string, string>

export const defaultSeriesColumns = [
	buildNameColumn(true),
	booksCountColumn,
] as ColumnDef<EntityGroup>[]
export const defaultLibraryColumns = [
	buildNameColumn(false),
	booksCountColumn,
] as ColumnDef<EntityGroup>[]

export const buildDefaultColumns = (isGroupedBySeries: boolean) =>
	isGroupedBySeries ? defaultSeriesColumns : defaultLibraryColumns

export const buildColumns = (isGroupedBySeries: boolean, columns?: ReactTableColumnSort[]) => {
	if (!columns?.length) {
		return buildDefaultColumns(isGroupedBySeries)
	}

	const sortedColumns = columns.sort((a, b) => a.position - b.position)
	const selectedColumnIds = sortedColumns.map(({ id }) => id)

	const columnMap = getColumnMap(isGroupedBySeries)

	return selectedColumnIds.map((id) => columnMap[id]).filter(Boolean) as ColumnDef<EntityGroup>[]
}
