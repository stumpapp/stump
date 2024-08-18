import { useLogsQuery } from '@stump/client'
import { Card, Heading, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Log } from '@stump/types'
import { createColumnHelper, SortingState } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Table } from '@/components/table'

import LogLevelBadge from './LogLevelBadge'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const DEBUG = import.meta.env.DEV
const LOCALE_BASE = 'settingsScene.server/logs.sections.persistedLogs.table'

const columnHelper = createColumnHelper<Log>()
const baseColumns = [
	columnHelper.accessor('timestamp', {
		cell: ({
			row: {
				original: { timestamp },
			},
		}) => (
			<Text size="sm" variant="muted">
				{dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')}
			</Text>
		),
		enableSorting: true,
		header: 'Time',
		sortingFn: ({ original: a }, { original: b }) => {
			return dayjs(a.timestamp).isBefore(b.timestamp) ? -1 : 1
		},
	}),
	columnHelper.accessor('level', {
		cell: ({
			row: {
				original: { level },
			},
		}) => <LogLevelBadge level={level} />,
		enableSorting: true,
		header: 'Level',
		size: 75,
		sortingFn: ({ original: a }, { original: b }) => {
			const levels = ['error', 'warn', 'info', 'debug']
			return levels.indexOf(a.level) < levels.indexOf(b.level) ? -1 : 1
		},
	}),
	columnHelper.accessor('message', {
		cell: ({
			row: {
				original: { message },
			},
		}) => <Text size="xs">{message}</Text>,
		header: 'Message',
		size: 300,
	}),
	columnHelper.accessor('job_id', {
		cell: ({
			row: {
				original: { job_id },
			},
		}) =>
			job_id ? (
				<ToolTip content={<span className="font-mono">{job_id}</span>}>
					<Text size="xs" variant="muted" className="font-mono">
						{job_id.slice(0, 5)}..{job_id.slice(-5)}
					</Text>
				</ToolTip>
			) : null,
		header: 'Job ID',
		size: 150,
	}),
]

export default function PersistedLogsTable() {
	const { t } = useLocaleContext()

	const [search] = useSearchParams()
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
	const [sortState, setSortState] = useState<SortingState>([])
	const [jobId] = useState(() => search.get('job_id'))

	const firstSort = useMemo(
		() =>
			sortState[0] ?? {
				desc: true,
				id: 'timestamp',
			},
		[sortState],
	)
	const { logs, pageData } = useLogsQuery({
		page: pagination.pageIndex,
		page_size: pagination.pageSize,
		params: {
			direction: firstSort.desc ? 'desc' : 'asc',
			job_id: jobId,
			order_by: firstSort.id,
			zero_based: true,
		},
	})
	const pageCount = pageData?.total_pages ?? 1

	return (
		<Card className="bg-background-surface p-1">
			<Table
				sortable
				columns={baseColumns}
				options={{
					debugColumns: DEBUG,
					debugHeaders: DEBUG,
					debugTable: DEBUG,
					manualPagination: true,
					manualSorting: true,
					onPaginationChange: setPagination,
					onSortingChange: setSortState,
					pageCount,
					state: {
						pagination,
						sorting: sortState,
					},
				}}
				data={logs}
				fullWidth
				// TODO(aaron): loader
				emptyRenderer={() => (
					<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
						<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
						<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
						<Text size="sm" variant="muted">
							{t(`${LOCALE_BASE}.emptySubtitle`)}
						</Text>
					</div>
				)}
				isZeroBasedPagination
			/>
		</Card>
	)
}
