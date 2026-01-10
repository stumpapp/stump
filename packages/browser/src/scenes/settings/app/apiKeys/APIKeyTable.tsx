import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Card, cn, Text } from '@stump/components'
import { ApiKeyTableQuery, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { KeyRound, Slash } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getCommonPinningStyles } from '@/components/table/Table'

import APIKeyActionMenu from './APIKeyActionMenu'
import APIKeyInspector from './APIKeyInspector'
import DeleteAPIKeyConfirmModal from './DeleteAPIKeyConfirmModal'

dayjs.extend(relativeTime)

const query = graphql(`
	query APIKeyTable {
		apiKeys {
			id
			name
			permissions {
				__typename
				... on UserPermissionStruct {
					value
				}
			}
			lastUsedAt
			expiresAt
			createdAt
		}
	}
`)

export type APIKey = ApiKeyTableQuery['apiKeys'][number]

export default function APIKeyTable() {
	const { sdk } = useSDK()

	const {
		data: { apiKeys },
	} = useSuspenseGraphQL(query, sdk.cacheKey('apiKeys'))

	const { t } = useLocaleContext()

	const [deletingKey, setDeletingKey] = useState<APIKey | null>(null)
	const [inspectingKey, setInspectingKey] = useState<APIKey | null>(null)

	const columns = useMemo(
		() => [
			columnHelper.accessor('name', {
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getFieldKey('name'))}
					</Text>
				),
				cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
			}),
			columnHelper.display({
				id: 'permission_count',
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getFieldKey('permissions'))}
					</Text>
				),
				cell: ({
					row: {
						original: { permissions },
					},
				}) => (
					<div className="flex">
						<Badge
							variant="primary"
							size="sm"
							className={cn('flex items-center justify-between space-x-1 pl-2 pr-1', {
								'pr-2': permissions.__typename === 'InheritPermissionStruct',
							})}
						>
							<span>
								{t(
									getFieldKey(
										permissions.__typename === 'InheritPermissionStruct' ? 'inherited' : 'explicit',
									),
								)}
							</span>
							{permissions.__typename !== 'InheritPermissionStruct' && (
								<span className="flex h-5 w-5 items-center justify-center rounded-md bg-fill-brand-secondary">
									{permissions.value.length}
								</span>
							)}
						</Badge>
					</div>
				),
			}),
			columnHelper.accessor('lastUsedAt', {
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getFieldKey('last_used'))}
					</Text>
				),
				cell: ({ getValue }) => {
					const parsed = dayjs(getValue())
					return (
						<Text
							size="sm"
							title={parsed.isValid() ? parsed.format('LLL') : t('common.notUsedYet')}
						>
							{parsed.isValid() ? parsed.fromNow() : t('common.never')}
						</Text>
					)
				},
			}),
			columnHelper.accessor('expiresAt', {
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getFieldKey('expiration'))}
					</Text>
				),
				cell: ({ getValue }) => {
					const parsed = dayjs(getValue())
					return (
						<Text
							size="sm"
							title={parsed.isValid() ? parsed.format('LLL') : t(getKey('noExpiration'))}
						>
							{parsed.isValid() ? parsed.format('LL') : 'Never'}
						</Text>
					)
				},
			}),
			columnHelper.display({
				id: 'actions',
				header: () => null,
				cell: ({ row: { original: apiKey } }) => (
					<div className="flex items-center justify-center">
						<APIKeyActionMenu
							onSelectForDelete={() => setDeletingKey(apiKey)}
							onSelectForInspect={() => setInspectingKey(apiKey)}
						/>
					</div>
				),
				size: 20,
			}),
		],
		[t],
	)

	const table = useReactTable({
		columns,
		data: apiKeys || [],
		getCoreRowModel: getCoreRowModel(),
		state: {
			columnPinning: { right: ['actions'] },
		},
	})
	const { rows } = table.getRowModel()

	if (!apiKeys?.length) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<KeyRound className="h-6 w-6 text-foreground-muted" />
							<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
						</span>
					</div>

					<div className="text-center">
						<Text>{t(getKey('empty.title'))}</Text>
						<Text size="sm" variant="muted">
							{t(getKey('empty.action'))}
						</Text>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<>
			<APIKeyInspector apiKey={inspectingKey} onClose={() => setInspectingKey(null)} />
			<DeleteAPIKeyConfirmModal apiKey={deletingKey} onClose={() => setDeletingKey(null)} />

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
										className="h-14 bg-background px-2 last:px-0"
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

const columnHelper = createColumnHelper<APIKey>()

const LOCALE_BASE = 'settingsScene.app/apiKeys'
const getFieldKey = (key: string) => `${LOCALE_BASE}.shared.fields.${key}`
const getKey = (key: string) => `${LOCALE_BASE}.sections.table.${key}`
