import { cn, Heading, NativeSelect, Text } from '@stump/components'
import {
	Column,
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	TableOptions,
	useReactTable,
} from '@tanstack/react-table'
import clsx from 'clsx'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useOverlayScrollbars } from 'overlayscrollbars-react'
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react'

import { usePreferences } from '@/hooks/usePreferences'
import { useTheme } from '@/hooks/useTheme'

import TablePagination from './Pagination'
import TableFilterInput from './TableFilterInput'
import TableFilterSelect from './TableFilterSelect'

export interface TableProps<T = unknown, V = unknown> {
	data: T[]
	columns: ColumnDef<T, V>[]
	options: Omit<TableOptions<T>, 'data' | 'columns' | 'getCoreRowModel'>
	fullWidth?: boolean
	searchable?: boolean
	sortable?: boolean
	emptyRenderer?: () => React.ReactNode
	isZeroBasedPagination?: boolean
	cellClassName?: string
}

// TODO: move into components package!
// TODO: loading state
// TODO: total count for pagination...

export default function Table<T, V>({
	data,
	columns,
	options,
	searchable,
	sortable,
	emptyRenderer,
	isZeroBasedPagination,
	cellClassName,
	...props
}: TableProps<T, V>) {
	const rootRef = useRef<HTMLDivElement | null>(null)
	const viewportRef = useRef<HTMLDivElement | null>(null)

	const [sorting, setSorting] = useState<SortingState>([])

	const filterColRef = useRef<HTMLSelectElement | null>(null)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()
	const { isDarkVariant } = useTheme()

	const [initialize] = useOverlayScrollbars({
		defer: true,
		options: {
			scrollbars: {
				theme: isDarkVariant ? 'os-theme-light' : 'os-theme-dark',
			},
		},
	})

	useEffect(() => {
		const { current: root } = rootRef
		const { current: viewport } = viewportRef

		if (root && viewport && !enable_hide_scrollbar) {
			initialize({
				elements: {
					viewport: viewport,
				},
				target: root,
			})
		}
	}, [initialize, enable_hide_scrollbar])

	const table = useReactTable({
		onSortingChange: setSorting,
		...options,
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		state: {
			sorting,
			...options.state,
			columnFilters,
			globalFilter,
		},
	})

	const { pageSize, pageIndex } = table.getState().pagination

	const pageCount = options.pageCount ?? table.getPageCount()
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

	const handleFilter = (value?: string) => {
		const filterCol = filterColRef.current?.value
		if (filterCol === 'GLOBAL_FILTER') {
			setGlobalFilter(value || '')
		} else if (filterCol) {
			table.getColumn(filterCol)?.setFilterValue(value)
		}
	}

	const handlePageChanged = (page: number) => {
		table.setPageIndex(isZeroBasedPagination ? page - 1 : page)
	}

	const tableRows = table.getRowModel().rows

	return (
		<div className="flex flex-col space-y-2">
			<div className="relative" ref={rootRef} data-overlayscrollbars-initialize>
				<div
					className={cn('divide block max-w-full overflow-y-hidden overflow-x-scroll', {
						'scrollbar-hide': enable_hide_scrollbar,
					})}
					ref={viewportRef}
				>
					<table className={clsx('divide-y', { 'w-full': props.fullWidth })}>
						<thead className="border-b border-edge text-left">
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<th
												key={header.id}
												colSpan={header.colSpan}
												className="py-2.5 first:pl-2.5"
												style={{
													...getCommonPinningStyles(header.column),
												}}
											>
												<div
													className={clsx('flex items-center', {
														'cursor-pointer select-none': header.column.getCanSort() && sortable,
													})}
													onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
													style={{
														width: header.getSize(),
													}}
												>
													<Heading className="line-clamp-1 w-full text-sm font-medium">
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
						<tbody className="divide-y divide-edge">
							{tableRows.map((row) => {
								return (
									<tr key={row.id}>
										{row.getVisibleCells().map((cell) => {
											return (
												<td
													key={cell.id}
													className={cn('py-2 first:pl-2.5', cellClassName)}
													style={{
														width: cell.column.getSize(),
														...getCommonPinningStyles(cell.column),
													}}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											)
										})}
									</tr>
								)
							})}
							{tableRows.length === 0 && emptyRenderer && (
								<tr>
									<td colSpan={columns.length}>{emptyRenderer()}</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex items-center justify-between px-3">
				<div className="flex items-center gap-4">
					<Text
						variant="muted"
						className="hidden flex-shrink-0 items-center gap-1 md:flex"
						size="sm"
					>
						{tableRows.length > 0 ? (
							<>
								<span>
									Showing <strong>{viewBounds.firstIndex}</strong> to{' '}
									<strong>{viewBounds.lastIndex}</strong>
								</span>
								of <strong>{viewBounds.totalCount}</strong>
							</>
						) : (
							'Nothing to show'
						)}
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
					onChangePage={handlePageChanged}
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
		<span className="ml-1.5 shrink-0">
			{direction === 'asc' ? (
				<ArrowUp className="h-3 w-3 text-foreground-muted" />
			) : (
				<ArrowDown className="h-3 w-3 text-foreground-muted" />
			)}
		</span>
	)
}

export const getTableModels = ({
	filtered,
	expanded,
	sorted,
}: {
	filtered?: boolean
	expanded?: boolean
	sorted?: boolean
}) => ({
	getCoreRowModel: getCoreRowModel(),
	...(filtered ? { getFilteredRowModel: getFilteredRowModel() } : {}),
	...(expanded ? { getExpandedRowModel: getExpandedRowModel(), getRowCanExpand: () => true } : {}),
	...(sorted ? { getSortedRowModel: getSortedRowModel() } : {}),
})

export function getCommonPinningStyles<T>(column: Column<T>) {
	const isPinned = column.getIsPinned()

	const styles: CSSProperties = {
		left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
		position: isPinned ? 'sticky' : undefined,
		right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
		zIndex: isPinned ? 1 : undefined,
	}

	return styles
}
