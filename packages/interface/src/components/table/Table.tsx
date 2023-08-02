import { Heading, NativeSelect, Text } from '@stump/components'
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	TableOptions,
	useReactTable,
} from '@tanstack/react-table'
import clsx from 'clsx'
import { SortAscending, SortDescending } from 'phosphor-react'
import { useMemo, useRef, useState } from 'react'

import TablePagination from './Pagination'
import TableFilterInput from './TableFilterInput'
import TableFilterSelect from './TableFilterSelect'

export interface TableProps<T = unknown, V = unknown> {
	data: T[]
	columns: ColumnDef<T, V>[]
	options: Omit<TableOptions<T>, 'data' | 'columns'>
	fullWidth?: boolean
	searchable?: boolean
	sortable?: boolean
}

// TODO: move into components package!
// TODO: loading state
export default function Table<T, V>({
	data,
	columns,
	options,
	searchable,
	sortable,
	...props
}: TableProps<T, V>) {
	const [sorting, setSorting] = useState<SortingState>([])

	const filterColRef = useRef<HTMLSelectElement | null>(null)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	const table = useReactTable({
		...options,
		columns,
		data,
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
		state: {
			...options.state,
			columnFilters,
			globalFilter,
			sorting,
		},
	})

	// const headers = [{ header: 'All', id: 'GLOBAL_FILTER' }].concat(
	// 	table
	// 		.getAllColumns()
	// 		.map((col) => col.columns.map((c) => ({ header: c.columnDef.header as string, id: c.id })))
	// 		.flat(),
	// )

	const { pageSize, pageIndex } = table.getState().pagination

	const pageCount = table.getPageCount()
	const dataCount = data.length
	const viewBounds = useMemo(() => {
		const isLessThanPage = dataCount < pageSize

		const expectedLastIndex = (pageIndex + 1) * pageSize
		const expectedFirstIndex = expectedLastIndex - (pageSize - 1)
		const expectedTotalCount = pageCount * pageSize

		if (isLessThanPage) {
			return {
				// firstIndex will still be expectedFirstIndex
				firstIndex: expectedFirstIndex,
				// lastIndex will be expectedLastIndex - (pageSize - data.length)
				lastIndex: expectedLastIndex - (pageSize - dataCount),
				// totalCount will be expectedTotalCount - (pageSize - data.length)
				totalCount: expectedTotalCount - (pageSize - dataCount),
			}
		}

		return {
			firstIndex: expectedFirstIndex,
			lastIndex: expectedLastIndex,
			totalCount: expectedTotalCount,
		}
	}, [pageCount, pageSize, dataCount, pageIndex])

	function handleFilter(value?: string) {
		const filterCol = filterColRef.current?.value
		if (filterCol === 'GLOBAL_FILTER') {
			setGlobalFilter(value || '')
		} else if (filterCol) {
			table.getColumn(filterCol)?.setFilterValue(value)
		}
	}

	return (
		<div className="divide block max-w-full overflow-y-hidden overflow-x-scroll p-3 scrollbar-hide">
			<table className={clsx('divide-y', { 'w-full': props.fullWidth })}>
				<thead className="border-b border-gray-75 text-left dark:border-gray-800">
					{table
						.getHeaderGroups()
						// .slice(1)
						.map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th key={header.id} colSpan={header.colSpan} className="py-2.5">
											<div
												className={clsx('flex items-center', {
													'cursor-pointer select-none': header.column.getCanSort() && sortable,
												})}
												onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
											>
												<Heading className="text-sm font-medium">
													{flexRender(header.column.columnDef.header, header.getContext())}
												</Heading>
												{sortable && (
													<SortIcon
														direction={(header.column.getIsSorted() as SortDirection) ?? null}
													/>
												)}
											</div>
										</th>
									)
								})}
							</tr>
						))}
				</thead>
				<tbody className="divide-y divide-gray-75 dark:divide-gray-800">
					{table.getRowModel().rows.map((row) => {
						return (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => {
									return (
										<td key={cell.id} className="py-2">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									)
								})}
							</tr>
						)
					})}
				</tbody>
			</table>
			<div className="h-2" />
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Text variant="muted" className="flex flex-shrink-0 items-center gap-1" size="sm">
						<span>
							Showing <strong>{viewBounds.firstIndex}</strong> to{' '}
							<strong>{viewBounds.lastIndex}</strong>
						</span>
						of <strong>{viewBounds.totalCount}</strong>
					</Text>

					<NativeSelect
						disabled={pageCount <= 1 && dataCount <= pageSize}
						size="sm"
						options={[10, 20, 30, 40, 50].map((pageSize) => ({
							label: `Show ${pageSize} rows`,
							// FIXME: don't cast once my select can consume numbers :nomnom:
							value: pageSize.toString(),
						}))}
						value={pageSize.toString()}
						onChange={(e) => {
							const parsed = parseInt(e.target.value, 10)
							if (!isNaN(parsed) && parsed > 0) {
								table.setPageSize(parsed)
							}
						}}
					/>

					{searchable && (
						<>
							<TableFilterInput onChange={handleFilter} />
							<TableFilterSelect />
						</>
					)}
				</div>

				<TablePagination
					currentPage={pageIndex + 1}
					pages={pageCount}
					onPageChange={(page) => table.setPageIndex(page)}
				/>
			</div>
		</div>
	)
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
	if (!direction) {
		return null
	}

	return (
		<span className="ml-1.5">{direction === 'asc' ? <SortAscending /> : <SortDescending />}</span>
	)
}
