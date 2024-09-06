import { cn, Text } from '@stump/components'
import { DirectoryListingFile } from '@stump/types'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import React, { useMemo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useWindowSize } from 'rooks'

import { SortIcon } from '@/components/table'

import { useFileExplorerContext } from '../context'
import FileThumbnail from '../FileThumbnail'

const columnHelper = createColumnHelper<DirectoryListingFile>()
const baseColumns = [
	columnHelper.display({
		cell: ({
			row: {
				original: { path, is_directory },
			},
		}) => <FileThumbnail path={path} isDirectory={is_directory} />,
		header: () => (
			<Text size="sm" variant="secondary">
				Cover
			</Text>
		),
		id: 'thumbnail',
		size: 10,
	}),
]

export default function FileTable() {
	const { files, onSelect } = useFileExplorerContext()
	const { innerWidth } = useWindowSize()

	const [sorting, setSorting] = useState<SortingState>([])

	const columns = useMemo(
		() => [
			...baseColumns.slice(0, 1),
			columnHelper.accessor('name', {
				cell: ({ row: { original: file }, getValue }) => (
					<Text size="sm" className="cursor-pointer hover:underline" onClick={() => onSelect(file)}>
						{getValue()}
					</Text>
				),
				header: () => (
					<Text size="sm" variant="secondary">
						Name
					</Text>
				),
				size: innerWidth ? innerWidth * 0.2 : 250,
			}),
		],
		[onSelect, innerWidth],
	)

	const table = useReactTable({
		columns,
		data: files,
		defaultColumn: {
			size: 40,
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	})

	const { rows } = table.getRowModel()
	return (
		<div className="relative mb-5 h-full w-full flex-1 flex-grow">
			<AutoSizer>
				{({ height, width }) => (
					<div
						className={cn('h-full min-w-full overflow-x-auto', {
							'scrollbar-hide': true,
						})}
						style={{
							height,
							width,
						}}
					>
						<table
							className="min-w-full table-fixed"
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
												className="h-10 pl-1.5 pr-1.5 first:pl-4 last:pr-4"
												style={{
													width: header.getSize(),
												}}
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
												className="py-1 pl-1.5 pr-1.5 first:pl-4 last:pr-4"
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
		</div>
	)
}
