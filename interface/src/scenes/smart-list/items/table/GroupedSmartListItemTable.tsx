import { cn, Text } from '@stump/components'
import { Library, Series, SmartListItemGroup } from '@stump/types'
import {
	createColumnHelper,
	ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { SortIcon } from '@/components/table'

import { useSafeWorkingView } from '../../context'
import { bookFuzzySearch } from './mediaColumns'
import SmartListBookTable from './SmartListBookTable'
import TableHeaderActions from './TableHeaderActions'

type TableRow = SmartListItemGroup<Series> | SmartListItemGroup<Library>
const columnHelper = createColumnHelper<TableRow>()

const buildColumns = (isGroupedBySeries: boolean) => [
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
						className={cn('h-4 w-4 text-muted transition-transform duration-200', {
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
							className={cn('h-4 w-4 text-muted transition-transform duration-200', {
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
	}),
	columnHelper.accessor(({ books }) => books.length, {
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
	}),
]

type Props = {
	items: SmartListItemGroup<Series>[] | SmartListItemGroup<Library>[]
}

// TODO: virtualization
export default function GroupedSmartListItemTable({ items }: Props) {
	const {
		workingView: { search },
	} = useSafeWorkingView()

	// TODO: sorting state from view
	const [sortState, setSortState] = useState<SortingState>([])
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const isGroupedBySeries = 'library_id' in (items[0]?.entity ?? {})

	const columns = useMemo(() => buildColumns(isGroupedBySeries), [isGroupedBySeries])

	const table = useReactTable({
		columns,
		data: items,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getRowCanExpand: () => true,
		getSortedRowModel: getSortedRowModel(),
		// TODO: this needs a bit of work I think, I think maybe separating the searches??
		globalFilterFn: (
			{
				original: {
					books,
					entity: { name },
				},
			},
			_columnId,
			search,
		) => {
			// TODO: we should only search selected columns
			const matchedBooks = books.filter((book) => bookFuzzySearch(book, search))
			if (matchedBooks.length) {
				return true
			} else if (name.toLowerCase().includes(search.toLowerCase())) {
				return true
			} else {
				return false
			}
		},
		onExpandedChange: setExpanded,
		onSortingChange: setSortState,
		state: {
			expanded,
			globalFilter: search,
			sorting: sortState,
		},
	})

	const { rows } = table.getRowModel()

	return (
		<div className="relative w-full">
			<TableHeaderActions />
			<table className="w-full">
				<thead>
					<tr>
						{table.getFlatHeaders().map((header) => (
							<th key={header.id} className="h-10 first:pl-4 last:pr-4">
								<div
									className={cn('flex items-center gap-x-2', {
										'cursor-pointer select-none': header.column.getCanSort(),
									})}
									onClick={header.column.getToggleSortingHandler()}
									// style={{
									// 	width: header.getSize(),
									// }}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
									<SortIcon direction={(header.column.getIsSorted() as SortDirection) ?? null} />
								</div>
							</th>
						))}
					</tr>
				</thead>

				<tbody className="divide divide-y divide-edge">
					{rows.map((row) => (
						<React.Fragment key={row.id}>
							<tr key={row.id} className="h-10">
								{row.getVisibleCells().map((cell) => (
									<td className="first:pl-4 last:pr-4" key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
							{row.getIsExpanded() && (
								<tr key={row.id + 'expanded'}>
									<td colSpan={columns.length}>
										<SmartListBookTable books={row.original.books} isIsolatedTable={false} />
									</td>
								</tr>
							)}
						</React.Fragment>
					))}
				</tbody>
			</table>
		</div>
	)
}
