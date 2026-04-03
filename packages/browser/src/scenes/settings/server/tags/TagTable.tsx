import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Button, Card, Dropdown, Text } from '@stump/components'
import { graphql, Tag } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import { Ellipsis, Slash, Tag as TagIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getCommonPinningStyles } from '@/components/table/Table'

import DeleteTagConfirmModal from './DeleteTagConfirmModal'
import RenameTagModal from './RenameTagModal'

const query = graphql(`
	query TagTable {
		tags {
			id
			name
		}
	}
`)

export default function TagTable() {
	const { sdk } = useSDK()

	const {
		data: { tags },
	} = useSuspenseGraphQL(query, sdk.cacheKey('tags'))

	const { t } = useLocaleContext()

	const sortedTags = useMemo(
		() => [...(tags || [])].sort((a, b) => a.name.localeCompare(b.name)),
		[tags],
	)

	const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
	const [renamingTag, setRenamingTag] = useState<Tag | null>(null)

	const columns = useMemo(
		() => [
			columnHelper.accessor('name', {
				header: () => (
					<Text size="sm" variant="secondary">
						{t(getColumnKey('name'))}
					</Text>
				),
				cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
			}),
			columnHelper.display({
				id: 'actions',
				header: () => null,
				cell: ({ row: { original: tag } }) => (
					<div className="flex items-center justify-center">
						<Dropdown modal={false}>
							<Dropdown.Trigger asChild>
								<Button size="icon" variant="ghost">
									<Ellipsis className="h-4 w-4 text-foreground" />
								</Button>
							</Dropdown.Trigger>

							<Dropdown.Content align="end">
								<Dropdown.Group>
									<Dropdown.Item onClick={() => setRenamingTag(tag)}>
										<span>{t(getActionKey('rename'))}</span>
									</Dropdown.Item>
									<Dropdown.Item onClick={() => setDeletingTag(tag)}>
										<span>{t('common.delete')}</span>
									</Dropdown.Item>
								</Dropdown.Group>
							</Dropdown.Content>
						</Dropdown>
					</div>
				),
				size: 20,
			}),
		],
		[t],
	)

	const table = useReactTable({
		columns,
		data: sortedTags,
		getCoreRowModel: getCoreRowModel(),
		state: {
			columnPinning: { right: ['actions'] },
		},
	})
	const { rows } = table.getRowModel()

	if (!tags?.length) {
		return (
			<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
				<div className="flex flex-col space-y-3">
					<div className="relative flex justify-center">
						<span className="flex items-center justify-center rounded-lg bg-background-surface p-2">
							<TagIcon className="h-6 w-6 text-foreground-muted" />
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
			<RenameTagModal tag={renamingTag} onClose={() => setRenamingTag(null)} />
			<DeleteTagConfirmModal tag={deletingTag} onClose={() => setDeletingTag(null)} />

			<Card className="overflow-x-auto">
				<table
					className="min-w-full"
					style={{
						width: table.getCenterTotalSize(),
					}}
				>
					<thead className="border-b border-edge">
						<tr>
							{table.getFlatHeaders().map((header) => (
								<th
									key={header.id}
									className="sticky !top-0 z-[2] h-10 bg-background-surface/50 px-2 shadow-sm"
									style={getCommonPinningStyles(header.column)}
								>
									<div
										className="flex items-center"
										style={{
											width: header.getSize(),
										}}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
									</div>
								</th>
							))}
						</tr>
					</thead>

					<tbody className="divide divide-y divide-edge">
						{rows.map((row) => (
							<tr key={row.id}>
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

const columnHelper = createColumnHelper<Tag>()

const LOCALE_BASE = 'settingsScene.server/tags.sections.table'
const getColumnKey = (key: string) => `${LOCALE_BASE}.columns.${key}`
const getActionKey = (key: string) => `${LOCALE_BASE}.actionMenu.${key}`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
