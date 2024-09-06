import { cn, Text } from '@stump/components'
import { AttachmentMeta } from '@stump/types'
import {
	createColumnHelper,
	flexRender,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import React, { useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { getTableModels, SortIcon } from '@/components/table'
import { usePreferences } from '@/hooks'
import { formatBytes } from '@/utils/format'

type Props = {
	attachments: AttachmentMeta[]
}
export default function EmailerSendRecordAttachmentTable({ attachments }: Props) {
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	const [sorting, setSorting] = useState<SortingState>([])

	const table = useReactTable({
		columns,
		data: attachments,
		onSortingChange: setSorting,
		state: {
			sorting,
		},
		...getTableModels({ sorted: true }),
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
							<tr>
								{table.getFlatHeaders().map((header) => {
									const isSortable = header.column.getCanSort()
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
	)
}

const columnHelper = createColumnHelper<AttachmentMeta>()
const columns = [
	columnHelper.accessor('filename', {
		cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Filename
			</Text>
		),
	}),
	columnHelper.accessor('size', {
		cell: ({ getValue }) => <Text size="sm">{formatBytes(getValue())}</Text>,
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Size
			</Text>
		),
	}),
]
