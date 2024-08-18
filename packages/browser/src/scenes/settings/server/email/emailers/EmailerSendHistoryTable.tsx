import { cn, IconButton, Text, ToolTip } from '@stump/components'
import { EmailerSendRecord } from '@stump/types'
import {
	createColumnHelper,
	ExpandedState,
	flexRender,
	SortDirection,
	useReactTable,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { ChevronDown, Copy } from 'lucide-react'
import React, { useState } from 'react'

import { getTableModels, SortIcon } from '@/components/table'

import EmailerSendRecordAttachmentTable from './EmailerSendRecordAttachmentTable'

type Props = {
	records: EmailerSendRecord[]
}
export default function EmailerSendHistoryTable({ records }: Props) {
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const table = useReactTable({
		columns,
		data: records,
		onExpandedChange: setExpanded,
		state: {
			expanded,
		},
		...getTableModels({ expanded: true, sorted: true }),
	})

	const { rows } = table.getRowModel()

	return (
		<div className="mx-auto w-full max-w-2xl px-1">
			<table className="w-full">
				<thead>
					<tr>
						{table.getFlatHeaders().map((header) => (
							<th key={header.id} className="h-10 first:pl-4 last:pr-4">
								<div
									className={cn('flex items-center gap-x-2', {
										'cursor-pointer select-none': header.column.getCanSort(),
									})}
									onClick={header.column.getToggleSortingHandler()}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
									<SortIcon direction={(header.column.getIsSorted() as SortDirection) ?? null} />
								</div>
							</th>
						))}
					</tr>
				</thead>

				<tbody className="divide relative divide-y divide-edge">
					{rows.map((row) => (
						<React.Fragment key={row.id}>
							<tr key={row.id} className="h-10">
								{row.getVisibleCells().map((cell) => (
									<td className="first:pl-4 last:pr-4" key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
							{row.getIsExpanded() && (
								<tr key={row.id + 'expanded'}>
									<td colSpan={columns.length}>
										<EmailerSendRecordAttachmentTable
											attachments={row.original.attachment_meta || []}
										/>
									</td>
								</tr>
							)}
						</React.Fragment>
					))}
				</tbody>
			</table>
		</div>
	)
}

const columnHelper = createColumnHelper<EmailerSendRecord>()
const columns = [
	columnHelper.accessor('sent_at', {
		cell: ({ getValue }) => <Text size="sm">{dayjs(getValue()).format('LLL')}</Text>,
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Sent at
			</Text>
		),
		id: 'sent_at',
	}),
	columnHelper.accessor('recipient_email', {
		cell: ({ getValue }) => <Text size="sm">{getValue()}</Text>,
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Recipient
			</Text>
		),
		id: 'recipient_email',
	}),
	columnHelper.display({
		cell: ({
			row: {
				original: { sent_by, sent_by_user_id },
			},
		}) => {
			if (sent_by) {
				return <Text size="sm">{sent_by.username}</Text>
			} else if (sent_by_user_id) {
				return (
					<div className="flex items-center space-x-2">
						<ToolTip content={sent_by_user_id} align="start" size="sm">
							<Text size="sm">
								{sent_by_user_id.slice(0, 5)}..{sent_by_user_id.slice(-5)}
							</Text>
						</ToolTip>

						{/* TODO: implement copy to clipboard */}
						<IconButton size="xxs" disabled>
							<Copy className="h-3 w-3" />
						</IconButton>
					</div>
				)
			} else {
				return <Text size="sm">Unknown</Text>
			}
		},
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Sender
			</Text>
		),
		id: 'sender',
	}),
	// FIXME: multiple attachments in a single email
	columnHelper.display({
		cell: ({ row }) => {
			const {
				original: { attachment_meta },
			} = row

			if (!attachment_meta) {
				return <Text size="sm">None</Text>
			}

			const isAlreadyExpanded = row.getIsExpanded()
			return (
				<div
					className="flex cursor-pointer items-center space-x-2"
					onClick={row.getToggleExpandedHandler()}
				>
					<Text size="sm">{isAlreadyExpanded ? 'Hide' : 'Show'}</Text>
					<span className="text-foreground-muted">
						<ChevronDown
							className={cn('h-4 w-4', {
								'rotate-180': isAlreadyExpanded,
							})}
						/>
					</span>
				</div>
			)
		},
		header: () => (
			<Text size="sm" className="text-left" variant="muted">
				Attachments
			</Text>
		),
		id: 'attachments-sub-table',
	}),
]
