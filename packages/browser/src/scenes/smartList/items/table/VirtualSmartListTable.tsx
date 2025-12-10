import { cn } from '@stump/components'
import { Media } from '@stump/graphql'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useMemo, useRef } from 'react'

import { SortIcon } from '@/components/table'

import { useScrollElement } from '../../../../hooks/useScrollElement'
import { useSafeWorkingView } from '../../context'
import { buildColumns } from './mediaColumns'
import { SmartListTableItem } from './SmartListTableItem'
import TableHeaderActions from './TableHeaderActions'

type Props = {
	books: Media[]
}

const HEADER_HEIGHT = 40
const ROW_HEIGHT = 48

export default function VirtualSmartListTable({ books }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
	const scrollElement = useScrollElement(containerRef)

	const { workingView, updateWorkingView } = useSafeWorkingView()

	const search = workingView.search

	const columns = useMemo(() => buildColumns(workingView.bookColumns), [workingView.bookColumns])

	const sorting = useMemo(() => workingView?.bookSorting ?? [], [workingView])
	const setSorting = useCallback(
		(updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
			if (typeof updaterOrValue === 'function') {
				const updated = updaterOrValue(sorting)
				updateWorkingView({
					bookSorting: updated.length ? updated : undefined,
				})
			} else {
				updateWorkingView({
					bookSorting: updaterOrValue.length ? updaterOrValue : undefined,
				})
			}
		},
		[updateWorkingView, sorting],
	)

	const table = useReactTable({
		columns,
		data: books,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getRowId: (book) => book.id,
		onSortingChange: setSorting,
		state: {
			globalFilter: search,
			sorting,
		},
	})

	const rows = table.getRowModel().rows

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		estimateSize: () => ROW_HEIGHT,
		getScrollElement: () => scrollElement,
		overscan: 10,
	})

	const virtualItems = rowVirtualizer.getVirtualItems()
	const totalSize = rowVirtualizer.getTotalSize()

	return (
		<div ref={containerRef} className="flex w-full flex-col">
			<TableHeaderActions />

			<div
				className="sticky top-0 z-30 flex w-full border-b border-edge bg-background"
				style={{ height: HEADER_HEIGHT }}
			>
				{table.getHeaderGroups().map((headerGroup) => (
					<div key={headerGroup.id} className="flex w-full bg-background-surface">
						{headerGroup.headers.map((header) => {
							const isSortable = header.column.getCanSort()
							return (
								<div
									key={header.id}
									className={cn(
										'flex items-center overflow-hidden bg-background-surface px-4 py-2 text-sm font-medium text-foreground-subtle',
										{
											'cursor-pointer select-none gap-x-2': isSortable,
										},
									)}
									onClick={header.column.getToggleSortingHandler()}
									style={{
										flex: `0 0 ${header.getSize()}px`,
										width: header.getSize(),
										minWidth: header.column.columnDef.minSize,
										maxWidth: header.column.columnDef.maxSize,
									}}
								>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
									{isSortable && (
										<SortIcon direction={(header.column.getIsSorted() as SortDirection) ?? null} />
									)}
								</div>
							)
						})}
					</div>
				))}
			</div>

			<div className="relative w-full" style={{ height: totalSize }}>
				{/* Spacer to push items down to their virtual position */}
				{virtualItems.length > 0 && virtualItems[0] && (
					<div style={{ height: virtualItems[0].start }} />
				)}

				{virtualItems.map((virtualItem) => {
					const row = rows[virtualItem.index]
					if (!row) return null

					return (
						<div
							key={virtualItem.key}
							ref={rowVirtualizer.measureElement}
							data-index={virtualItem.index}
						>
							<SmartListTableItem row={row} />
						</div>
					)
				})}
			</div>
		</div>
	)
}
