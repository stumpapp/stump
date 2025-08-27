import { Card, cn } from '@stump/components'
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	RowData,
	useReactTable,
} from '@tanstack/react-table'
import { useLayoutEffect, useRef } from 'react'
import { useWindowSize } from 'rooks'

import { calculateTableSizing } from './utils'

type Props<Item> = {
	columns: ColumnDef<Item>[]
	items: Item[]
	showMissing: boolean
}

export default function MetadataEditorTable<Item extends RowData>({
	columns,
	items,
	showMissing,
}: Props<Item>) {
	const table = useReactTable({
		columns,
		data: items,
		getCoreRowModel: getCoreRowModel(),
		columnResizeMode: 'onChange',
		state: {
			expanded: {
				missing: showMissing,
			},
		},
	})

	const windowDimensions = useWindowSize()
	const tableContainerRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		if (!tableContainerRef.current) return
		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (entry) {
				const initialColumnSizing = calculateTableSizing(
					table.getFlatHeaders(),
					entry.contentRect.width,
				)
				table.setColumnSizing(initialColumnSizing)
			}
		})
		resizeObserver.observe(tableContainerRef.current)
		return () => {
			resizeObserver.disconnect()
		}
	}, [table, windowDimensions.innerWidth])

	const { rows } = table.getRowModel()

	return (
		<Card
			className="overflow-hidden rounded-xl border-edge"
			ref={tableContainerRef}
			style={{
				direction: table.options.columnResizeDirection,
				width: '100%',
			}}
		>
			<table
				className="w-fit divide-y divide-edge"
				style={{
					width: table.getCenterTotalSize(),
				}}
			>
				<thead>
					<tr className="relative flex">
						{table.getFlatHeaders().map((header) => (
							<th
								key={header.id}
								{...{
									colSpan: header.colSpan,
									style: {
										width: header.getSize(),
									},
								}}
								className="relative min-h-10"
							>
								{flexRender(header.column.columnDef.header, header.getContext())}

								{header.column.getCanResize() && (
									<div
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										className={cn(
											'absolute -right-px top-0 z-50 h-full w-px cursor-col-resize touch-none opacity-0 transition-opacity duration-75 hover:opacity-50',
											{
												'opacity-100': header.column.getIsResizing(),
											},
											{
												'bg-foreground': !header.column.getIsResizing(),
											},
										)}
									/>
								)}
							</th>
						))}
					</tr>
				</thead>

				<tbody className="divide-y divide-edge">
					{rows.map((row) => (
						<tr key={row.id} className="flex w-fit divide-x divide-edge">
							{row.getVisibleCells().map((cell) => (
								<td
									className="py-2 pl-1.5 pr-1.5 first:pl-4 last:pr-4"
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

					{!rows.length && (
						<tr>
							<td colSpan={2}>
								<div className="flex h-32 items-center justify-center">No Metadata</div>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</Card>
	)
}
