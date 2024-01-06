import { getMediaThumbnail } from '@stump/api'
import { cn, Text } from '@stump/components'
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

import { SortIcon } from '@/components/table'

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
		size: 40,
	}),
	columnHelper.accessor(({ name, metadata }) => metadata?.title || name, {
		cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
		enableSorting: true,
		header: () => (
			<Text size="sm" variant="muted">
				Name
			</Text>
		),
		id: 'name',
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
		<table className="w-full">
			<thead>
				{table.getFlatHeaders().map((header) => {
					const isSortable = header.column.getCanSort()
					return (
						<th key={header.id} className="h-10 first:pl-2">
							<div
								className={cn('flex items-center', {
									'cursor-pointer select-none gap-x-2': isSortable,
								})}
								onClick={header.column.getToggleSortingHandler()}
								// style={{
								// 	width: header.getSize(),
								// }}
							>
								{flexRender(header.column.columnDef.header, header.getContext())}
								{isSortable && (
									<SortIcon direction={(header.column.getIsSorted() as SortDirection) ?? null} />
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
							<td className="first:pl-2" key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}
