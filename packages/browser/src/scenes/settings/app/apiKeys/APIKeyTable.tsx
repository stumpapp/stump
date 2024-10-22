import { useQuery, useSDK } from '@stump/client'
import { Card, cn, Text } from '@stump/components'
import { APIKey } from '@stump/sdk'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'
import relativeTime from 'dayjs/plugin/relativeTime'
import { KeyRound, Slash } from 'lucide-react'

dayjs.extend(relativeTime)

// TODO(koreader): localize
export default function APIKeyTable() {
	const { sdk } = useSDK()
	const { data: apiKeys } = useQuery([sdk.apiKey.keys.get], () => sdk.apiKey.get(), {
		suspense: true,
	})

	const columns = useMemo(
		() => [
			columnHelper.accessor('name', {
				header: () => (
					<Text size="sm" variant="secondary">
						Name
					</Text>
				),
				cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
			}),
			columnHelper.accessor('last_used_at', {
				header: () => (
					<Text size="sm" variant="secondary">
						Last used
					</Text>
				),
				cell: ({ getValue }) => {
					const parsed = dayjs(getValue())
					return <Text size="sm">{parsed.isValid() ? parsed.fromNow() : 'Never'}</Text>
				},
			}),
		],
		[],
	)

	const table = useReactTable({
		columns,
		data: apiKeys || [],
		getCoreRowModel: getCoreRowModel(),
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
						<Text>You haven't created any API keys yet</Text>
						<Text size="sm" variant="muted">
							Create an API key to get started
						</Text>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<Card className="overflow-hidden">
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
								<th
									key={header.id}
									className="sticky !top-0 z-[2] h-10 bg-background pl-1.5 pr-1.5 shadow-sm first:pl-4 last:pr-4"
								>
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
						<tr key={row.id} className="odd:bg-background-surface">
							{row.getVisibleCells().map((cell) => (
								<td
									className="h-14 pl-1.5 pr-1.5 first:pl-4 last:pr-4"
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
	)
}

const columnHelper = createColumnHelper<APIKey>()
