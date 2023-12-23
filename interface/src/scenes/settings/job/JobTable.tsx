import { Badge, Heading, Text } from '@stump/components'
import { JobDetail, JobStatus } from '@stump/types'
import { createColumnHelper, getCoreRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import React, { useMemo } from 'react'

import { Table } from '@/components/table'

import { useAppContext } from '../../../context.ts'
import { useLocaleContext } from '../../../i18n/index.ts'
import { useJobSettingsContext } from './context.ts'
import JobActionMenu from './JobActionMenu.tsx'
import RunningJobElapsedTime from './RunningJobElapsedTime.tsx'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const DEBUG = import.meta.env.DEV
const LOCALE_BASE = 'settingsScene.jobs.historyTable'

const columnHelper = createColumnHelper<JobDetail>()

export default function JobTable() {
	const { isServerOwner } = useAppContext()
	const { t } = useLocaleContext()
	const { jobs, pagination, setPagination, pageCount } = useJobSettingsContext()

	const columns = useMemo(
		() => [
			columnHelper.accessor('name', {
				cell: ({
					row: {
						original: { name },
					},
				}) => (
					<Text size="sm" className="line-clamp-1">
						{name}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.name`),
			}),
			columnHelper.accessor('description', {
				cell: ({
					row: {
						original: { description },
					},
				}) => (
					<Text size="sm" variant="muted" className="line-clamp-1">
						{description}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.description`),
			}),
			columnHelper.accessor((job) => `${job.completed_task_count}/${job.task_count}`, {
				cell: ({ row }) => (
					<Text size="sm" variant="muted" className="line-clamp-1">
						{row.original.completed_task_count}/{row.original.task_count}
					</Text>
				),
				header: t(`${LOCALE_BASE}.columns.tasks`),
			}),
			columnHelper.accessor('created_at', {
				cell: ({ row: { original: job } }) => {
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
			}),
			columnHelper.display({
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
			}),
			columnHelper.display({
				cell: ({ row: { original: job } }) => {
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
			}),
			columnHelper.display({
				cell: ({ row }) => (isServerOwner ? <JobActionMenu job={row.original} /> : null),
				id: 'actions',
				size: 28,
			}),
		],
		[t, isServerOwner],
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
			// TODO(aaron): loader
			emptyRenderer={() => (
				<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
					<CircleSlash2 className="h-10 w-10 pb-2 pt-1 dark:text-gray-400" />
					<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
					<Text size="sm" variant="muted">
						{t(`${LOCALE_BASE}.emptySubtitle`)}
					</Text>
				</div>
			)}
			isZeroBasedPagination
		/>
	)
}
