import { cn, Text } from '@stump/components'
import { DirectoryListingFile } from '@stump/types'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import React from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

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
			<Text size="sm" variant="muted">
				Cover
			</Text>
		),
		id: 'thumbnail',
		size: 10,
	}),
	columnHelper.accessor('name', {
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		header: () => (
			<Text size="sm" variant="muted">
				Name
			</Text>
		),
	}),
	columnHelper.display({
		cell: () => null,
		id: 'spacer',
	}),
]

export default function FileTable() {
	const { files } = useFileExplorerContext()

	const table = useReactTable({
		columns: baseColumns,
		data: files,
		getCoreRowModel: getCoreRowModel(),
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
													{/* {isSortable && (
														<SortIcon
															direction={(header.column.getIsSorted() as SortDirection) ?? null}
														/>
													)} */}
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

// const getBook = async (path: string) => {
// 	try {
// 		const response = await queryClient.fetchQuery([mediaQueryKeys.getMedia, { path }], () =>
// 			mediaApi.getMedia({
// 				path,
// 			}),
// 		)
// 		return response.data.data?.at(0) ?? null
// 	} catch (error) {
// 		console.error(error)
// 		return null
// 	}
// }
