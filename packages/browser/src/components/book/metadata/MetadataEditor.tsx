import { Button, Card, CheckBox, cn, Heading, Input, Label, Text } from '@stump/components'
import { FragmentType, graphql, MetadataEditorFragment, useFragment } from '@stump/graphql'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	Header,
	useReactTable,
} from '@tanstack/react-table'
import getProperty from 'lodash/get'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useWindowSize } from 'rooks'
import { match, P } from 'ts-pattern'

import { usePaths } from '@/paths'

import { BadgeListCell, TextCell } from './cells'

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
	const navigate = useNavigate()
	const paths = usePaths()

	const [showMissing, setShowMissing] = useState(false)
	const [isEditing, setIsEditing] = useState(false)

	const columns = useMemo(
		() => [
			columnHelper.accessor('label', {
				header: ({ table }) => (
					<div className="flex h-full items-center pl-4 font-bold leading-6 text-foreground/90">
						<Label className="flex items-center">
							<CheckBox
								variant="primary"
								checked={table.getIsSomeRowsExpanded()}
								onClick={() => setShowMissing((prev) => !prev)}
							/>

							<span className="ml-2">Missing</span>
						</Label>
					</div>
				),
				cell: (info) => (
					<Text variant="muted" className="text-sm font-medium">
						{info.getValue()}
					</Text>
				),
				enableResizing: true,
			}),
			columnHelper.accessor('field', {
				header: () => (
					<div className="flex h-full flex-1 items-center justify-end pr-1.5">
						<Button
							size="sm"
							newYork
							variant="outline"
							className="rounded-lg"
							onClick={() => setIsEditing((prev) => !prev)}
						>
							Edit
						</Button>
					</div>
				),
				cell: (info) =>
					match(info.getValue())
						.with(
							P.union(
								'genres',
								'characters',
								'colorists',
								'coverArtists',
								'editors',
								'inkers',
								'letterers',
								'pencillers',
								'teams',
								'writers',
							),
							(field) => {
								const values = getProperty(metadata, field) ?? []
								return (
									<BadgeListCell
										values={values}
										onItemClick={(index) => {
											const item = values[index]
											if (!item) return
											navigate(
												paths.bookSearchWithFilter({
													metadata: { [field]: { likeAnyOf: [item] } },
												}),
											)
										}}
									/>
								)
							},
						)
						.with('links', () => {
							const safeUrls = (getProperty(metadata, 'links') ?? []).map((url) => {
								try {
									return new URL(url).hostname
								} catch {
									return url
								}
							})
							return (
								<BadgeListCell
									values={safeUrls}
									onItemClick={(index) => window.open(metadata?.links?.[index], '_blank')}
								/>
							)
						})
						.otherwise(() => <TextCell value={getProperty(metadata, info.getValue())} />),
				// cell: (info) => (
				// 	<Input
				// 		value={getProperty(metadata, info.getValue()) || ''}
				// 		onChange={(e) => {
				// 			// Handle input change
				// 		}}
				// 		size="sm"
				// 	/>
				// ),
				enableResizing: false,
				meta: {
					isGrow: true,
				},
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
		<div className="flex flex-col gap-y-2">
			<div>
				<Heading size="sm">Metadata</Heading>
			</div>
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

function getSize(size = 100, max = Number.MAX_SAFE_INTEGER, min = 40) {
	return Math.max(Math.min(size, max), min)
}

declare module '@tanstack/react-table' {
	interface ColumnMeta {
		isGrow?: boolean
		widthPercentage?: number
	}
}

function calculateTableSizing<DataType>(
	columns: Header<DataType, unknown>[],
	totalWidth: number,
): Record<string, number> {
	let totalAvailableWidth = totalWidth
	let totalIsGrow = 0

	columns.forEach((header) => {
		const column = header.column.columnDef
		if (!column.size) {
			if (!column.meta?.isGrow) {
				let calculatedSize = 100
				if (column?.meta?.widthPercentage) {
					calculatedSize = column.meta.widthPercentage * totalWidth * 0.01
				} else {
					calculatedSize = totalWidth / columns.length
				}

				const size = getSize(calculatedSize, column.maxSize, column.minSize)

				column.size = size
			}
		}

		if (column.meta?.isGrow) totalIsGrow += 1
		else totalAvailableWidth -= getSize(column.size, column.maxSize, column.minSize)
	})

	const sizing: Record<string, number> = {}

	columns.forEach((header) => {
		const column = header.column.columnDef
		if (column.meta?.isGrow) {
			let calculatedSize = 100
			calculatedSize = Math.floor(totalAvailableWidth / totalIsGrow)
			const size = getSize(calculatedSize, column.maxSize, column.minSize)
			column.size = size
		}

		sizing[`${column.id}`] = Number(column.size)
	})

	return sizing
}
