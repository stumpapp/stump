import { getMediaThumbnail } from '@stump/api'
import { usePreferences } from '@stump/client'
import { cn, Link, Text } from '@stump/components'
import { Media } from '@stump/types'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	SortDirection,
	SortingState,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { SortIcon } from '@/components/table'
import paths from '@/paths'

// TODO: Allow customizing and persisting views on smart lists. This would allow custom columns, sorting, and filtering.

const columnHelper = createColumnHelper<Media>()

const baseColumns = [
	columnHelper.display({
		cell: ({
			row: {
				original: { id },
			},
		}) => (
			<img
				className="aspect-[2/3] h-14 w-auto rounded-sm object-cover"
				src={getMediaThumbnail(id)}
			/>
		),
		header: () => (
			<Text size="sm" variant="muted">
				Cover
			</Text>
		),
		id: 'cover',
		// height is 56px, so with a 2/3 aspect ratio, the width is 37.3333333333px
		size: 60,
	}),
	columnHelper.accessor(({ name, metadata }) => metadata?.title || name, {
		cell: ({
			getValue,
			row: {
				original: { id },
			},
		}) => (
			<Link
				to={paths.bookOverview(id)}
				className="line-clamp-2 text-sm text-opacity-100 hover:text-opacity-90"
			>
				{getValue()}
			</Link>
		),
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="muted">
				Name
			</Text>
		),
		id: 'name',
		minSize: 285,
	}),
	columnHelper.accessor('pages', {
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="muted">
				Pages
			</Text>
		),
		id: 'pages',
	}),
	columnHelper.accessor(
		({ metadata }) => {
			const { year, month, day } = metadata || {}

			// TODO: validation
			if (!!year && !!month && !!day) {
				return dayjs(`${year}-${month}-${day}`).format('YYYY-MM-DD')
			} else if (!!year && !!month) {
				return dayjs(`${year}-${month}`).format('YYYY-MM')
			} else if (year) {
				return dayjs(`${year}`).format('YYYY')
			}

			return ''
		},
		{
			cell: ({ getValue }) => (
				<Text size="sm" variant="muted">
					{getValue()}
				</Text>
			),
			enableSorting: true,
			header: () => (
				<Text size="sm" variant="muted">
					Published
				</Text>
			),
			id: 'published',
		},
	),
	columnHelper.accessor(({ created_at }) => dayjs(created_at).format('M/D/YYYY, HH:mm:ss'), {
		cell: ({ getValue }) => (
			<Text size="sm" variant="muted">
				{getValue()}
			</Text>
		),
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="muted">
				Added
			</Text>
		),
		id: 'added',
	}),
]

type Props = {
	books: Media[]
}

// TODO: virtualization
export default function SmartListBookTable({ books }: Props) {
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	const [sortState, setSortState] = useState<SortingState>([])

	const table = useReactTable({
		columns: baseColumns,
		data: books,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSortState,
		state: {
			sorting: sortState,
		},
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
							{table.getFlatHeaders().map((header) => {
								const isSortable = header.column.getCanSort()
								// TODO: make sticky work sticky -left-8
								return (
									<th key={header.id} className="h-10 first:pl-4 last:pr-4">
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
						</thead>

						<tbody>
							{rows.map((row) => (
								<tr key={row.id} className="odd:bg-background-200">
									{row.getVisibleCells().map((cell) => (
										<td
											className="first:pl-4 last:pr-4"
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
