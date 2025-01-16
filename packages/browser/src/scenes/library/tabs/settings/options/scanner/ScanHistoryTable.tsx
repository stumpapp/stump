import { useQuery, useSDK } from '@stump/client'
import { Badge, Card, cn, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { APIKey, LibraryScanRecord } from '@stump/sdk'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Database, KeyRound, Slash } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getCommonPinningStyles } from '@/components/table/Table'
import { useLibraryContext } from '@/scenes/library/context'

dayjs.extend(relativeTime)

export default function ScanHistoryTable() {
	const { sdk } = useSDK()
	const {
		library: { id },
	} = useLibraryContext()
	const { data: scanHistory } = useQuery(
		[sdk.library.keys.scanHistory, id],
		() => sdk.library.scanHistory(id),
		{
			suspense: true,
		},
	)
	const { t } = useLocaleContext()

	const [inspectingRecord, setInspectingRecord] = useState<LibraryScanRecord | null>(null)

	const columns = useMemo(
		() => [
			columnHelper.accessor('timestamp', {
				header: () => (
					<Text size="sm" variant="secondary">
						{/* {t(getFieldKey('timestamp'))} */}
						Timestamp
					</Text>
				),
				cell: ({ getValue }) => {
					const parsed = dayjs(getValue())
					if (!parsed.isValid()) return null

					const fromNowSecs = dayjs().diff(parsed, 'seconds')

					return (
						<Text size="sm" title={parsed.format('LLL')}>
							{fromNowSecs <= 120 ? parsed.fromNow() : parsed.format('LLL')}
						</Text>
					)
				},
			}),
			columnHelper.display({
				id: 'config',
				header: () => (
					<Text size="sm" variant="secondary">
						Config
					</Text>
				),
				cell: ({ row: { original } }) => {
					const isDefault = !original.options
					return (
						<Badge
							variant={isDefault ? 'default' : 'primary'}
							onClick={isDefault ? () => setInspectingRecord(original) : undefined}
						>
							{isDefault ? 'Default' : 'Custom'}
						</Badge>
					)
				},
			}),
			// columnHelper.display({
			// 	id: 'actions',
			// 	header: () => null,
			// 	cell: ({ row: { original: apiKey } }) => (
			// 		<div className="flex items-center justify-center">
			// 			<APIKeyActionMenu
			// 				onSelectForDelete={() => setDeletingKey(apiKey)}
			// 				onSelectForInspect={() => setInspectingRecord(apiKey)}
			// 			/>
			// 		</div>
			// 	),
			// 	size: 20,
			// }),
		],
		[t],
	)

	const table = useReactTable({
		columns,
		data: scanHistory || [],
		getCoreRowModel: getCoreRowModel(),
		state: {
			columnPinning: { right: ['actions'] },
		},
	})
	const { rows } = table.getRowModel()

	if (!scanHistory?.length) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<Database className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</span>
					</div>

					<div className="text-center">
						There are no scans recorded for this library
						{/* <Text>{t(getKey('empty.title'))}</Text>
						<Text size="sm" variant="muted">
							{t(getKey('empty.action'))}
						</Text> */}
					</div>
				</div>
			</Card>
		)
	}

	return (
		<>
			{/* <APIKeyInspector apiKey={inspectingKey} onClose={() => setInspectingRecord(null)} /> */}

			<Card className="overflow-x-auto">
				<table
					className="min-w-full"
					style={{
						width: table.getCenterTotalSize(),
					}}
				>
					<thead className="border-b border-edge">
						<tr className="">
							{table.getFlatHeaders().map((header) => {
								return (
									<th
										key={header.id}
										className="sticky !top-0 z-[2] h-10 bg-background-surface/50 px-2 shadow-sm"
										style={getCommonPinningStyles(header.column)}
									>
										<div
											className="flex items-center"
											onClick={header.column.getToggleSortingHandler()}
											style={{
												width: header.getSize(),
											}}
										>
											{flexRender(header.column.columnDef.header, header.getContext())}
										</div>
									</th>
								)
							})}
						</tr>
					</thead>

					<tbody className="divide divide-y divide-edge">
						{rows.map((row) => (
							<tr key={row.id} className="">
								{row.getVisibleCells().map((cell) => (
									<td
										className="h-14 bg-background px-2"
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
					</tbody>
				</table>
			</Card>
		</>
	)
}

const columnHelper = createColumnHelper<LibraryScanRecord>()

// const LOCALE_BASE = 'settingsScene.app/scanHistory'
// const getFieldKey = (key: string) => `${LOCALE_BASE}.shared.fields.${key}`
// const getKey = (key: string) => `${LOCALE_BASE}.sections.table.${key}`
