import { Card, CheckBox, cn, Heading, Label, Text } from '@stump/components'
import { FragmentType, graphql, MetadataEditorFragment, useFragment } from '@stump/graphql'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import getProperty from 'lodash/get'
import { useMemo, useState } from 'react'

const fragment = graphql(`
	fragment MetadataEditor on MediaMetadata {
		ageRating
		characters
		colorists
		coverArtists
		day
		editors
		genres
		inkers
		letterers
		links
		month
		number
		pageCount
		pencillers
		publisher
		series
		summary
		teams
		volume
		writers
	}
`)

type Props = {
	data?: FragmentType<typeof fragment> | null
}

export default function MetadataEditor({ data }: Props) {
	const metadata = useFragment(fragment, data)

	const [showMissing, setShowMissing] = useState(false)

	const columns = useMemo(
		() => [
			columnHelper.accessor('label', {
				header: ({ table }) => (
					<Label className="flex h-full items-center pl-4 font-bold leading-6 text-foreground/90">
						<CheckBox
							variant="primary"
							checked={table.getIsSomeRowsExpanded()}
							onClick={() => setShowMissing((prev) => !prev)}
						/>

						<span className="ml-2">Missing</span>
					</Label>
				),
				cell: (info) => (
					<Text variant="muted" className="text-sm font-medium">
						{info.getValue()}
					</Text>
				),
				enableResizing: true,
			}),
			columnHelper.accessor('field', {
				header: () => null,
				cell: (info) => <Text>{getProperty(metadata, info.getValue())}</Text>,
				enableResizing: false,
			}),
		],
		[metadata],
	)

	const items = useMemo(
		() =>
			keys
				.map((key) => ({
					label: labels[key],
					field: key,
				}))
				.filter(({ field }) => showMissing || !isEmptyField(metadata?.[field])),
		[metadata, showMissing],
	)

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

	const { rows } = table.getRowModel()

	return (
		<div className="flex flex-col gap-y-2">
			<div>
				<Heading size="sm">Metadata</Heading>
			</div>
			<Card className="overflow-hidden rounded-xl border-edge">
				<table
					className="min-w-full table-fixed divide-y divide-edge"
					style={{
						width: table.getCenterTotalSize(),
					}}
				>
					<thead>
						<tr className="flex">
							{table.getFlatHeaders().map((header) => (
								<th
									key={header.id}
									{...{
										colSpan: header.colSpan,
										style: {
											width: header.getSize(),
										},
									}}
									className="relative min-h-8"
								>
									{flexRender(header.column.columnDef.header, header.getContext())}

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
								</th>
							))}
						</tr>
					</thead>

					<tbody className="divide-y divide-edge">
						{rows.map((row) => (
							<tr key={row.id} className="flex divide-x divide-edge">
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
					</tbody>
				</table>
			</Card>
		</div>
	)
}

type MetadataField = keyof Omit<MetadataEditorFragment, '__typename' | ' $fragmentName'>

const labels: Record<MetadataField, string> = {
	ageRating: 'Age rating',
	characters: 'Characters',
	colorists: 'Colorists',
	coverArtists: 'Cover artists',
	day: 'Day',
	editors: 'Editors',
	genres: 'Genres',
	inkers: 'Inkers',
	letterers: 'Letterers',
	links: 'Links',
	month: 'Month',
	number: 'Number',
	pageCount: 'Pages',
	pencillers: 'Pencillers',
	publisher: 'Publisher',
	series: 'Series',
	summary: 'Summary',
	teams: 'Teams',
	volume: 'Volume',
	writers: 'Writers',
}
const keys = Object.keys(labels) as MetadataField[]

type Row = {
	label: string
	field: MetadataField
}

const columnHelper = createColumnHelper<Row>()

const isEmptyField = (data: unknown) => {
	if (Array.isArray(data)) {
		return data.length === 0
	} else if (typeof data === 'object' && data !== null) {
		return Object.keys(data).length === 0 || Object.values(data).every(isEmptyField)
	} else {
		return !data
	}
}
