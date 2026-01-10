import { Card, cn } from '@stump/components'
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	RowData,
	useReactTable,
} from '@tanstack/react-table'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { useWindowSize } from 'rooks'

import { getCommonPinningStyles } from '../table/Table'
import { calculateOptimalColumnWidth, calculateTableSizing } from './utils'

type Props<Item> = {
	columns: ColumnDef<Item>[]
	items: Item[]
	showMissing: boolean
}

// FIXME: This looks not great on mobile. It might be better to just have a separate, read-only
// table rendered on mobile which looks more like the mobile app

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
			columnPinning: {
				right: ['actions'],
			},
		},
		defaultColumn: {
			size: 120,
		},
	})

	const windowDimensions = useWindowSize()
	const tableContainerRef = useRef<HTMLDivElement>(null)
	const tableRef = useRef<HTMLTableElement>(null)

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

	const ensureResizeFillsSpace = useCallback(
		(headerId: string, adjustedWidth: number) => {
			if (tableContainerRef.current === null) {
				table.setColumnSizing((prev) => ({
					...prev,
					[headerId]: adjustedWidth,
				}))
			} else {
				const adjustedHeaders = table.getFlatHeaders().map((header) => {
					if (header.id === headerId) {
						return {
							...header,
							size: adjustedWidth,
						}
					}
					return header
				})
				const adjustedSize = calculateTableSizing(
					adjustedHeaders,
					tableContainerRef.current.clientWidth,
				)
				table.setColumnSizing(adjustedSize)
			}
		},
		[table],
	)

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
				ref={tableRef}
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
										...getCommonPinningStyles(header.column),
									},
								}}
								className="relative min-h-10"
							>
								{flexRender(header.column.columnDef.header, header.getContext())}

								{header.column.getCanResize() && (
									<div
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										onDoubleClick={() => {
											const optimalWidth = calculateOptimalColumnWidth(header.column.id)
											ensureResizeFillsSpace(header.column.id, optimalWidth)
										}}
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
						<tr key={row.id} className="flex w-fit">
							{row.getVisibleCells().map((cell) => (
								<td
									className="py-2 pl-1.5 pr-1.5 first:border-r first:border-edge first:pl-4 last:pl-0 last:pr-0"
									key={cell.id}
									style={{
										width: cell.column.getSize(),
										...getCommonPinningStyles(cell.column),
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
