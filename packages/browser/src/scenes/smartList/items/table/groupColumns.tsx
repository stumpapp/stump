import { cn, Text } from '@stump/components'
import { SmartListGroupedItem, SmartListViewColumn } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { MouseEventHandler, ReactNode } from 'react'

import TableColumnHeader from '@/components/table/TableColumnHeader'

type EntityGroup = SmartListGroupedItem
const columnHelper = createColumnHelper<EntityGroup>()

type ExpandToggleProps = {
	expanded: boolean
	onClick: MouseEventHandler<HTMLButtonElement>
	disabled?: boolean
	all?: boolean
	children?: ReactNode
}

function ExpandToggle({ expanded, onClick, disabled, all, children }: ExpandToggleProps) {
	const { t } = useLocaleContext()
	const translationKey = all
		? expanded
			? 'tableColumns.configuration.collapseAll'
			: 'tableColumns.configuration.expandAll'
		: expanded
			? 'tableColumns.configuration.collapse'
			: 'tableColumns.configuration.expand'

	return (
		<button
			title={t(translationKey)}
			className="gap-x-1 flex items-center"
			onClick={onClick}
			disabled={disabled}
		>
			<ChevronDown
				className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', {
					'rotate-180': expanded,
				})}
			/>
			{children}
		</button>
	)
}

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
				<ExpandToggle
					expanded={isExpanded}
					onClick={getToggleExpandedHandler()}
					disabled={!getCanExpand()}
				>
					<Text className="text-sm md:text-base line-clamp-1 text-left">{name}</Text>
				</ExpandToggle>
			)
		},
		enableGlobalFilter: true,
		enableSorting: true,
		header: ({ table: { getToggleAllRowsExpandedHandler, getIsAllRowsExpanded } }) => {
			const isAllRowsExpanded = getIsAllRowsExpanded()

			return (
				<div className="gap-x-1 flex items-center">
					<ExpandToggle
						expanded={isAllRowsExpanded}
						all
						onClick={(e) => {
							// Don't update the sorting state when clicking the expand all button
							e.stopPropagation()
							const handler = getToggleAllRowsExpandedHandler()
							handler(e)
						}}
					/>
					<TableColumnHeader
						translationKey={
							isGroupedBySeries ? 'tableColumns.labels.series' : 'tableColumns.labels.library'
						}
						variant="muted"
					/>
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
	header: () => <TableColumnHeader translationKey="tableColumns.labels.books" variant="muted" />,
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
	books: 'tableColumns.labels.books',
}

export const getColumnOptionMap = (isGroupedBySeries: boolean) =>
	({
		name: isGroupedBySeries ? 'tableColumns.labels.seriesName' : 'tableColumns.labels.libraryName',
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

export const buildColumns = (isGroupedBySeries: boolean, columns?: SmartListViewColumn[]) => {
	if (!columns?.length) {
		return buildDefaultColumns(isGroupedBySeries)
	}

	const sortedColumns = columns.sort((a, b) => a.position - b.position)
	const selectedColumnIds = sortedColumns.map(({ id }) => id)

	const columnMap = getColumnMap(isGroupedBySeries)

	return selectedColumnIds.map((id) => columnMap[id]).filter(Boolean) as ColumnDef<EntityGroup>[]
}
