import { cn } from '@stump/components'
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	OnChangeFn,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import React, { PropsWithChildren } from 'react'

import SortIcon from './SortIcon'

type EntityTableSorting =
	| {
			sorting: SortingState
			setSorting: OnChangeFn<SortingState>
	  }
	| {
			sorting?: never
			setSorting?: never
	  }

type EntityTableSearch =
	| {
			globalFilter: string
	  }
	| {
			globalFilter?: never
	  }

type StateOptions = EntityTableSorting & EntityTableSearch

export type EntityTableOptions = {
	enableMultiSort?: boolean
} & StateOptions

export type EntityTableProps<Entity> = {
	/**
	 * The items to render in the table.
	 */
	items: Entity[]
	/**
	 * The columns to render in the table. This is a prop in order to support dynamic columns,
	 * e.g. configurable columns.
	 */
	columns: ColumnDef<Entity>[]
	/**
	 * Additional options for the underlying table.
	 */
	options?: EntityTableOptions
	/**
	 * An optional renderer to wrap the table in. This is useful for providing a custom container,
	 * as needed.
	 */
	render?: (props: PropsWithChildren) => React.ReactNode
}

/**
 * A table component used for rendering:
 *
 * - Media / Books
 * - Series
 * - Authors
 *
 * This is separate from the `Table` component primarily in styling, and serves to provide a
 * unified look and feel for the application WRT the scenes which explore these entities.
 */
export default function EntityTable<Entity>({
	items,
	columns,
	options,
	render,
}: EntityTableProps<Entity>) {
	const { setSorting, enableMultiSort, ...state } = options ?? {}

	const table = useReactTable({
		columns,
		data: items,
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
						<tr key={row.id} className="odd:bg-background-surface">
							{row.getVisibleCells().map((cell) => (
								<td
									className="h-14 pl-1.5 pr-1.5 first:pl-4 last:pr-4"
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
