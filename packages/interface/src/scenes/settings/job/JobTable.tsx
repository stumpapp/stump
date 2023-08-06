import { Badge, Heading, Text } from '@stump/components'
import { JobDetail, JobStatus } from '@stump/types'
import { ColumnDef, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import React, { useMemo } from 'react'

import { Table } from '../../../components/table'
import { useLocaleContext } from '../../../i18n'
import { useJobSettingsContext } from './context'
import JobActionMenu from './JobActionMenu'
import RunningJobElapsedTime from './RunningJobElapsedTime'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const DEBUG = import.meta.env.DEV
const LOCALE_BASE = 'settingsScene.jobs.historyTable'

export default function JobTable() {
	const { t } = useLocaleContext()
	const { jobs, pagination, setPagination, pageCount } = useJobSettingsContext()

	const columns = useMemo<ColumnDef<JobDetail>[]>(
		() => [
			{
				// TODO(aaron): monospace font?
				accessorKey: 'name',
				cell: (info) => (
					<Text size="sm" className="line-clamp-1">
						{info.getValue<string>()}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.name`),
				id: 'type',
			},
			{
				accessorKey: 'description',
				cell: (info) => (
					<Text size="sm" variant="muted" className="line-clamp-1">
						{info.getValue<string>()}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.description`),
				id: 'description',
			},
			{
				accessorFn: (job) => `${job.completed_task_count}/${job.task_count}`,
				cell: ({ row }) => (
					<Text size="sm" variant="muted" className="line-clamp-1">
						{row.original.completed_task_count}/{row.original.task_count}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.tasks`),
				id: 'tasks',
			},
			{
				accessorKey: 'created_at',
				cell: ({ row }) => {
					const job = row.original
					if (job.created_at) {
						return (
							<Text size="sm" variant="muted" className="line-clamp-1">
								{dayjs(job.created_at).format('YYYY-MM-DD HH:mm:ss')}
							</Text>
						)
					}

					return null
				},
				header: t(`${LOCALE_BASE}.columns.createdAt`),
				id: 'created_at',
			},
			{
				accessorKey: 'status',
				cell: ({ row }) => {
					const getBadgeVariant = (status: JobStatus) => {
						if (status === 'COMPLETED') {
							return 'success'
						} else if (status === 'CANCELLED') {
							return 'warning'
						} else if (status === 'FAILED') {
							return 'error'
						} else {
							return 'primary'
						}
					}

					const job = row.original

					return (
						<Badge variant={getBadgeVariant(job.status)} size="xs">
							{job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase()}
						</Badge>
					)
				},
				header: 'Status',
				id: 'status',
			},
			{
				accessorKey: 'ms_elapsed',
				cell: ({ row }) => {
					const job = row.original

					const displayDuration = (duration: duration.Duration) => {
						//? TODO(aaron): This might be funny to have two formats, I think I should
						//? either just always show ms or just accept the 'rounding' of the duration
						if (duration.asSeconds() < 1) {
							return duration.format('HH:mm:ss:SSS')
						}

						return duration.format('HH:mm:ss')
					}

					const isRunningOrQueued = job.status === 'RUNNING' || job.status === 'QUEUED'

					if (job.status === 'RUNNING') {
						return <RunningJobElapsedTime job={job} formatDuration={displayDuration} />
					} else if (!isRunningOrQueued && job.ms_elapsed !== null) {
						return (
							<Text size="sm" variant="muted" className="line-clamp-1">
								{displayDuration(dayjs.duration(Number(job.ms_elapsed)))}
							</Text>
						)
					}

					return null
				},
				header: t(`${LOCALE_BASE}.columns.elapsed`),
				id: 'ms_elapsed',
			},
			{
				cell: ({ row }) => {
					const job = row.original
					if (job.status !== 'RUNNING' && job.status !== 'QUEUED') {
						return null
					}

					return <JobActionMenu job={job} />
				},
				id: 'actions',
			},
		],
		[t],
	)

	return (
		<Table
			sortable
			columns={columns}
			options={{
				debugColumns: DEBUG,
				debugHeaders: DEBUG,
				debugTable: DEBUG,
				enableSorting: false,
				getCoreRowModel: getCoreRowModel(),
				manualPagination: true,
				onPaginationChange: setPagination,
				pageCount,
				state: {
					pagination,
				},
			}}
			data={jobs}
			fullWidth
			emptyRenderer={() => (
				<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
					<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
					<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
					<Text size="sm" variant="muted">
						{t(`${LOCALE_BASE}.emptySubtitle`)}
					</Text>
				</div>
			)}
		/>
	)
}
