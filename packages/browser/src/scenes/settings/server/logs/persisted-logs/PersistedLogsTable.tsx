import { useSuspenseGraphQL } from '@stump/client'
import { Card, Heading, Text, ToolTip } from '@stump/components'
import { graphql, LogModelOrdering, OrderDirection, PersistedLogsQuery } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { createColumnHelper, SortingState } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Table } from '@/components/table'

import LogLevelBadge from './LogLevelBadge'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const query = graphql(`
	query PersistedLogs(
		$filter: LogFilterInput!
		$pagination: Pagination!
		$orderBy: [LogModelOrderBy!]!
	) {
		logs(filter: $filter, pagination: $pagination, orderBy: $orderBy) {
			nodes {
				id
				timestamp
				level
				message
				jobId
				context
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export type PersistedLog = PersistedLogsQuery['logs']['nodes'][number]

// TODO: fix stutters probably from suspense?

export default function PersistedLogsTable() {
	const { t } = useLocaleContext()

	const [search] = useSearchParams()
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
	const [sortState, setSortState] = useState<SortingState>([])
	const [jobId] = useState(() => search.get('jobId'))

	const firstSort = useMemo(
		() =>
			sortState[0] ?? {
				desc: true,
				id: LogModelOrdering.Timestamp,
			},
		[sortState],
	)

	const {
		data: {
			logs: { nodes: logs, pageInfo },
		},
	} = useSuspenseGraphQL(query, ['logs', firstSort, pagination], {
		filter: {
			jobId: jobId
				? {
						eq: jobId,
					}
				: undefined,
		},
		pagination: {
			offset: {
				page: pagination.pageIndex + 1, // Offset is 1-based
				pageSize: pagination.pageSize,
			},
		},
		orderBy: [
			{
				field: firstSort.id as LogModelOrdering,
				direction: firstSort.desc ? OrderDirection.Desc : OrderDirection.Asc,
			},
		],
	})

	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Invalid pagination type, expected OffsetPaginationInfo')
	}

	return (
		<Card>
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
					pageCount: pageInfo.totalPages,
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

const DEBUG = import.meta.env.DEV
const LOCALE_BASE = 'settingsScene.server/logs.sections.persistedLogs.table'

const columnHelper = createColumnHelper<PersistedLog>()
const baseColumns = [
	columnHelper.accessor('timestamp', {
		id: LogModelOrdering.Timestamp,
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
		id: LogModelOrdering.Level,
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
		id: LogModelOrdering.Message,
		cell: ({
			row: {
				original: { message },
			},
		}) => <Text size="xs">{message}</Text>,
		header: 'Message',
		size: 300,
	}),
	columnHelper.accessor('jobId', {
		id: LogModelOrdering.JobId,
		cell: ({
			row: {
				original: { jobId },
			},
		}) =>
			jobId ? (
				<ToolTip content={<span className="font-mono">{jobId}</span>}>
					<Text size="xs" variant="muted" className="font-mono">
						{jobId.slice(0, 5)}..{jobId.slice(-5)}
					</Text>
				</ToolTip>
			) : null,
		header: 'Job ID',
		size: 150,
	}),
]
