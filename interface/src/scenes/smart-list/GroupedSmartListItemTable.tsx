import { cn, Text } from '@stump/components'
import { Library, Series, SmartListItemGroup } from '@stump/types'
import {
	createColumnHelper,
	ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

import { SortIcon } from '@/components/table'

import SmartListBookTable from './SmartListBookTable'

type TableRow = SmartListItemGroup<Series> | SmartListItemGroup<Library>
const columnHelper = createColumnHelper<TableRow>()

const baseColumns = [
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
					<Text>{name}</Text>
				</button>
			)
		},
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
					<Text className="text-sm">Name</Text>
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
		enableSorting: true,
		header: () => <Text className="text-left text-sm">Books</Text>,
		id: 'books',
	}),
]

type Props = {
	items: SmartListItemGroup<Series>[] | SmartListItemGroup<Library>[]
}

// TODO: virtualization
export default function GroupedSmartListItemTable({ items }: Props) {
	const [sortState, setSortState] = useState<SortingState>([])
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const table = useReactTable({
		columns: baseColumns,
		data: items,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: () => true,
		getSortedRowModel: getSortedRowModel(),
		onExpandedChange: setExpanded,
		onSortingChange: setSortState,
		state: {
			expanded,
			sorting: sortState,
		},
	})

	const { rows } = table.getRowModel()

	return (
		<table>
			<thead>
				{table.getFlatHeaders().map((header) => (
					<th key={header.id} className="h-10">
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
			</thead>

			<tbody className="divide divide-y divide-edge">
				{rows.map((row) => (
					<React.Fragment key={row.id}>
						<tr key={row.id} className="h-10">
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
							))}
						</tr>
						{row.getIsExpanded() && (
							<tr key={row.id + 'expanded'}>
								<td colSpan={baseColumns.length}>
									<SmartListBookTable books={row.original.books} />
								</td>
							</tr>
						)}
					</React.Fragment>
				))}
			</tbody>
		</table>
	)
}
