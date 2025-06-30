import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Button, Card, Dropdown, Text } from '@stump/components'
import { graphql, ScanHistoryTableQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Database, Ellipsis, Slash } from 'lucide-react'
import { useMemo, useState } from 'react'

import { TableFooter } from '@/components/table'
import { getCommonPinningStyles } from '@/components/table/Table'

import { useLibraryManagement } from '../../../context'
import ScanRecordInspector from './ScanRecordInspector'

dayjs.extend(relativeTime)

const query = graphql(`
	query ScanHistoryTable($id: ID!) {
		libraryById(id: $id) {
			id
			scanHistory {
				id
				jobId
				timestamp
				options
			}
		}
	}
`)

// TODO: Remove these types once I figure out how to best represent this in GraphQL

export type CustomVisit = { regen_meta: boolean; regen_hashes: boolean }

export type ScanConfig = null | { force_rebuild: boolean } | CustomVisit

/**
 * The override options for a scan job. These options are used to override the default behavior, which generally
 * means that the scanner will visit books it otherwise would not. How much extra work is done depends on the
 * specific options.
 */
export type ScanOptions = { config?: ScanConfig }

export type LibraryScanRecord = Omit<
	NonNullable<ScanHistoryTableQuery['libraryById']>['scanHistory'][number],
	'libraryId' | 'options'
> & {
	options?: ScanOptions | null
}

export default function ScanHistoryTable() {
	const {
		library: { id },
		scan,
	} = useLibraryManagement()
	const { sdk } = useSDK()
	const {
		data: { libraryById },
	} = useSuspenseGraphQL(query, sdk.cacheKey('scanHistory', [id]), { id })
	const scanHistory = libraryById?.scanHistory || []

	const { t } = useLocaleContext()

	const [inspectingRecord, setInspectingRecord] = useState<LibraryScanRecord | null>(null)

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })

	const columns = useMemo(
		() => [
			columnHelper.accessor('timestamp', {
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getKey('table.columns.timestamp'))}
					</Text>
				),
				cell: ({ getValue }) => {
					const parsed = dayjs(getValue())
					if (!parsed.isValid()) return null

					return (
						<Text size="sm" title={parsed.format('LLL')}>
							{parsed.format('LLL')}
						</Text>
					)
				},
			}),
			columnHelper.display({
				id: 'config',
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getKey('table.columns.config'))}
					</Text>
				),
				cell: ({ row: { original } }) => {
					const isDefault = !original.options
					return (
						<Badge
							variant={isDefault ? 'default' : 'primary'}
							onClick={isDefault ? () => setInspectingRecord(original) : undefined}
						>
							{t(getKey(`table.${isDefault ? 'default' : 'custom'}`))}
						</Badge>
					)
				},
			}),
			...(scan
				? [
						columnHelper.display({
							id: 'actions',
							header: () => null,
							cell: ({ row: { original } }) => {
								if (!original.options) return null

								return (
									<div className="flex items-center justify-end">
										<Dropdown modal={false}>
											<Dropdown.Trigger asChild>
												<Button size="icon" variant="ghost">
													<Ellipsis className="h-4 w-4 text-foreground" />
												</Button>
											</Dropdown.Trigger>

											<Dropdown.Content align="end">
												<Dropdown.Group>
													<Dropdown.Item
														data-testid="run-scan"
														onClick={() => scan(original.options || undefined)}
													>
														<span>{t(getKey('runScan'))}</span>
													</Dropdown.Item>
													<Dropdown.Item
														data-testid="inspect-scan"
														onClick={() => setInspectingRecord(original)}
													>
														<span>{t(getKey('inspect'))}</span>
													</Dropdown.Item>
												</Dropdown.Group>
											</Dropdown.Content>
										</Dropdown>
									</div>
								)
							},
							size: 20,
						}),
					]
				: []),
		],
		[t, scan],
	)

	const table = useReactTable({
		columns,
		data: scanHistory || [],
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			columnPinning: { right: ['actions'] },
			pagination,
		},
		onPaginationChange: setPagination,
	})
	const { rows } = table.getRowModel()

	if (!scanHistory?.length) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-xl bg-background-surface p-2">
							<Database className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</span>
					</div>

					<div className="text-center">
						<Text size="sm" variant="muted">
							{t(getKey('empty'))}
						</Text>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<>
			<ScanRecordInspector record={inspectingRecord} onClose={() => setInspectingRecord(null)} />
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

				<TableFooter
					pagination={pagination}
					setPagination={setPagination}
					dataCount={scanHistory.length}
					pageCount={table.getPageCount()}
				/>
			</Card>
		</>
	)
}

const columnHelper = createColumnHelper<LibraryScanRecord>()

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.history'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
