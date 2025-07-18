import { cn } from '@stump/components'
import { SmartListGroupedItem } from '@stump/graphql'
import {
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
import { Fragment, useCallback, useMemo, useState } from 'react'

import { SortIcon } from '@/components/table'

import { useSafeWorkingView, useSmartListContext } from '../../context'
import { buildColumns, buildDefaultColumns } from './groupColumns'
import { bookFuzzySearch } from './mediaColumns'
import SmartListBookTable from './SmartListBookTable'
import TableHeaderActions from './TableHeaderActions'

type Props = {
	items: SmartListGroupedItem[]
}

// TODO: virtualization
// TODO: see if https://virtuoso.dev/grouped-numbers/ would work.

export default function GroupedSmartListItemTable({ items }: Props) {
	const { workingView, updateWorkingView } = useSmartListContext()
	const {
		workingView: { search },
	} = useSafeWorkingView()

	const [expanded, setExpanded] = useState<ExpandedState>({})

	const isGroupedBySeries = items[0]?.entity.__typename === 'Series'

	/**
	 * The columns selected in the working view
	 */
	const columns = useMemo(
		() =>
			workingView?.groupColumns?.length
				? buildColumns(isGroupedBySeries, workingView.groupColumns)
				: buildDefaultColumns(isGroupedBySeries),
		[workingView, isGroupedBySeries],
	)

	/**
	 * The current sorting state as it is stored in the working view
	 */
	const sorting = useMemo(() => workingView?.groupSorting ?? [], [workingView])
	/**
	 * A callback to update the sorting state of the table. This updates the current working view
	 */
	const setSorting = useCallback(
		(updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
			if (typeof updaterOrValue === 'function') {
				const updated = updaterOrValue(sorting)
				updateWorkingView({
					groupSorting: updated.length ? updated : undefined,
				})
			} else {
				updateWorkingView({
					groupSorting: updaterOrValue.length ? updaterOrValue : undefined,
				})
			}
		},
		[updateWorkingView, sorting],
	)

	// TODO(graphql): fix this typing
	const table = useReactTable({
		columns,
		data: items,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getRowCanExpand: () => true,
		getSortedRowModel: getSortedRowModel(),
		// TODO: this needs a bit of work I think...
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
		onSortingChange: setSorting,
		state: {
			expanded,
			globalFilter: search,
			sorting,
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
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
									<SortIcon direction={(header.column.getIsSorted() as SortDirection) ?? null} />
								</div>
							</th>
						))}
					</tr>
				</thead>

				<tbody className="divide relative divide-y divide-edge">
					{rows.map((row) => (
						<Fragment key={row.id}>
							<tr
								key={row.id}
								className={cn('h-10', {
									// FIXME: this doesn't look quite right...
									// 'sticky top-10 z-10 bg-background': row.getIsExpanded(),
								})}
							>
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
						</Fragment>
					))}
				</tbody>
			</table>
		</div>
	)
}
