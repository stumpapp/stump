/* eslint-disable react/prop-types */
import { UseDirectoryListingFile } from '@stump/client'
import { cn, Text } from '@stump/components'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { TableVirtuoso } from 'react-virtuoso'
import { useWindowSize } from 'rooks'

import { SortIcon } from '@/components/table'

import { useFileExplorerContext } from '../context'
import FileThumbnail from '../FileThumbnail'

const columnHelper = createColumnHelper<UseDirectoryListingFile>()
const baseColumns = [
	columnHelper.display({
		cell: ({
			row: {
				original: { path, isDirectory },
			},
		}) => <FileThumbnail path={path} isDirectory={isDirectory} />,
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
	const { files, onSelect, loadMore } = useFileExplorerContext()
	const { innerWidth } = useWindowSize()

	const [sorting, setSorting] = useState<SortingState>([])

	const columns = useMemo(
		() =>
			[
				...baseColumns.slice(0, 1),
				columnHelper.accessor('name', {
					cell: ({ row: { original: file }, getValue }) => (
						<Text
							size="sm"
							className="cursor-pointer hover:underline"
							onClick={() => onSelect(file)}
						>
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
			].map((column) => ({
				...column,
				// TODO: Allow sorting once the API supports it, otherwise we sort the current page and not the whole dataset
				// which is obviously not what we want
				enableSorting: false,
			})),
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
					<TableVirtuoso
						style={{ height, width }}
						totalCount={rows.length}
						components={{
							Table: (props) => (
								<table
									{...props}
									className="min-w-full table-fixed"
									style={{
										width: table.getCenterTotalSize(),
									}}
								/>
							),
							TableRow: (props) => {
								const index = props['data-index']
								const isEven = index % 2 === 0
								const row = rows[index]

								return (
									<tr {...props} className={cn({ 'bg-background-surface': !isEven })}>
										{row?.getVisibleCells().map((cell) => (
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
								)
							},
						}}
						fixedHeaderContent={() =>
							table.getFlatHeaders().map((header) => (
								<th
									key={header.id}
									className="h-10 bg-background pl-1.5 pr-1.5 first:pl-4 last:pr-4"
									style={{
										width: header.getSize(),
									}}
								>
									<div
										className={cn('flex items-center', {
											'cursor-pointer select-none gap-x-2': header.column.getCanSort(),
										})}
										onClick={header.column.getToggleSortingHandler()}
										style={{
											width: header.getSize(),
										}}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}

										{header.column.getCanSort() && (
											<SortIcon
												direction={(header.column.getIsSorted() as SortDirection) ?? null}
											/>
										)}
									</div>
								</th>
							))
						}
						endReached={loadMore}
					/>
				)}
			</AutoSizer>
		</div>
	)
}
