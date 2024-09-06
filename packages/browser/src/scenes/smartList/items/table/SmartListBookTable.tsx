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
import React, { PropsWithChildren, useCallback, useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { SortIcon } from '@/components/table'
import { usePreferences } from '@/hooks'

import { useSafeWorkingView, useSmartListContext } from '../../context'
import { buildColumns, defaultColumns } from './mediaColumns'
import TableHeaderActions from './TableHeaderActions'

type Props = {
	books: Media[]
	isIsolatedTable?: boolean
}

// TODO: virtualization
export default function SmartListBookTable({ books, isIsolatedTable = true }: Props) {
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
		() =>
			workingView?.book_columns?.length ? buildColumns(workingView.book_columns) : defaultColumns,
		[workingView],
	)

	/**
	 * The current sorting state as it is stored in the working view
	 */
	const sorting = useMemo(() => workingView?.book_sorting ?? [], [workingView])
	/**
	 * A callback to update the sorting state of the table. This updates the current working view
	 */
	const setSorting = useCallback(
		(updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
			if (typeof updaterOrValue === 'function') {
				const updated = updaterOrValue(sorting)
				updateWorkingView({
					book_sorting: updated.length ? updated : undefined,
				})
			} else {
				updateWorkingView({
					book_sorting: updaterOrValue.length ? updaterOrValue : undefined,
				})
			}
		},
		[updateWorkingView, sorting],
	)

	const table = useReactTable({
		columns,
		data: books,
		// FIXME: multi-sort not working when set
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

	const Container = isIsolatedTable
		? ({ children }: PropsWithChildren) => (
				<div className="relative w-full">
					<TableHeaderActions />
					{children}
				</div>
			)
		: React.Fragment

	return (
		<Container>
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
								<tr>
									{table.getFlatHeaders().map((header) => {
										const isSortable = header.column.getCanSort()
										// TODO: make sticky work sticky -left-8
										return (
											<th key={header.id} className="h-10 pl-1.5 pr-1.5 first:pl-4 last:pr-4">
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
								</tr>
							</thead>

							<tbody>
								{rows.map((row) => (
									<tr key={row.id} className="odd:bg-background-surface">
										{row.getVisibleCells().map((cell) => (
											<td
												className="pl-1.5 pr-1.5 first:pl-4 last:pr-4"
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
		</Container>
	)
}
