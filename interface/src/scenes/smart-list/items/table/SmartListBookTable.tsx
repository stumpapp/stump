import { usePreferences } from '@stump/client'
import { cn } from '@stump/components'
import { Media } from '@stump/types'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import React, { useCallback, useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { SortIcon } from '@/components/table'

import { useSafeWorkingView, useSmartListContext } from '../../context'
import { buildColumns, defaultColumns } from './mediaColumns'

// TODO: Allow customizing and persisting views on smart lists. This would allow custom columns, sorting, and filtering.

type Props = {
	books: Media[]
}

// TODO: virtualization
export default function SmartListBookTable({ books }: Props) {
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()
	const { workingView, updateWorkingView } = useSmartListContext()
	const {
		workingView: { search, enable_multi_sort },
	} = useSafeWorkingView()

	/**
	 * The columns selected in the working view
	 */
	const columns = useMemo(
		() => (workingView?.columns?.length ? buildColumns(workingView.columns) : defaultColumns),
		[workingView],
	)

	/**
	 * The current sorting state as it is stored in the working view
	 */
	const sorting = useMemo(() => workingView?.sorting ?? [], [workingView])
	/**
	 * A callback to update the sorting state of the table. This updates the current working view
	 */
	const setSorting = useCallback(
		(updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
			if (typeof updaterOrValue === 'function') {
				const updated = updaterOrValue(sorting)
				updateWorkingView({
					sorting: updated.length ? updated : undefined,
				})
			} else {
				updateWorkingView({
					sorting: updaterOrValue.length ? updaterOrValue : undefined,
				})
			}
		},
		[updateWorkingView, sorting],
	)

	const table = useReactTable({
		columns,
		data: books,
		enableMultiSort: enable_multi_sort ?? false,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			globalFilter: search,
			sorting,
		},
	})

	const { rows } = table.getRowModel()

	return (
		<AutoSizer disableHeight>
			{({ width }) => (
				<div
					className={cn('h-full min-w-full overflow-x-auto', {
						'scrollbar-hide': enable_hide_scrollbar,
					})}
					style={{
						width,
					}}
				>
					<table
						className="min-w-full"
						style={{
							width: table.getCenterTotalSize(),
						}}
					>
						<thead>
							{table.getFlatHeaders().map((header) => {
								const isSortable = header.column.getCanSort()
								// TODO: make sticky work sticky -left-8
								return (
									<th key={header.id} className="h-10 first:pl-4 last:pr-4">
										<div
											className={cn('flex items-center', {
												'cursor-pointer select-none gap-x-2': isSortable,
											})}
											onClick={header.column.getToggleSortingHandler()}
											style={{
												width: header.getSize(),
											}}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
											{isSortable && (
												<SortIcon
													direction={(header.column.getIsSorted() as SortDirection) ?? null}
												/>
											)}
										</div>
									</th>
								)
							})}
						</thead>

						<tbody>
							{rows.map((row) => (
								<tr key={row.id} className="odd:bg-background-200">
									{row.getVisibleCells().map((cell) => (
										<td
											className="first:pl-4 last:pr-4"
											key={cell.id}
											style={{
												width: cell.column.getSize(),
											}}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</AutoSizer>
	)
}
