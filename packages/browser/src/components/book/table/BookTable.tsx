import { cn } from '@stump/components'
import { Media } from '@stump/types'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	useReactTable,
} from '@tanstack/react-table'
import React, { PropsWithChildren, useMemo } from 'react'

import { SortIcon } from '@/components/table'

import { defaultColumns } from './columns'
import { BookTableOptions } from './types'

type Props = {
	books: Media[]
	options?: BookTableOptions
	render?: (props: PropsWithChildren) => React.ReactNode
}

export default function BookTable({ books, options, render }: Props) {
	const { setSorting, enableMultiSort, ...state } = options ?? {}

	// TODO: dynamic columns
	const columns = useMemo(() => defaultColumns, [])

	const table = useReactTable({
		columns,
		data: books,
		enableMultiSort,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state,
	})
	const { rows } = table.getRowModel()

	const Container = render ?? React.Fragment

	return (
		<Container>
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
							return (
								<th
									key={header.id}
									className="sticky !top-0 z-[2] h-10 bg-background pl-1.5 pr-1.5 shadow-sm first:pl-4 last:pr-4"
								>
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
						<tr key={row.id} className="odd:bg-background-200">
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
		</Container>
	)
}
