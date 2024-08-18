import { Badge, Card, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { CoreJobOutput, JobStatus, PersistedJob } from '@stump/types'
import { ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { Table } from '@/components/table'
import { useAppContext } from '@/context'

import { useJobSettingsContext } from './context.ts'
import JobActionMenu from './JobActionMenu.tsx'
import JobDataInspector from './JobDataInspector.tsx'
import RunningJobElapsedTime from './RunningJobElapsedTime.tsx'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const DEBUG = import.meta.env.DEV
const LOCALE_BASE = 'settingsScene.server/jobs.sections.history.table'

const columnHelper = createColumnHelper<PersistedJob>()

export default function JobTable() {
	const { isServerOwner } = useAppContext()
	const { t } = useLocaleContext()
	const { jobs, pagination, setPagination, pageCount } = useJobSettingsContext()

	const [inspectingData, setInspectingData] = useState<CoreJobOutput | null>()

	const columns = useMemo<ColumnDef<PersistedJob>[]>(
		() =>
			[
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
					cell: ({ row }) =>
						isServerOwner ? (
							<JobActionMenu job={row.original} onInspectData={setInspectingData} />
						) : null,
					id: 'actions',
					size: 28,
				}),
			] as ColumnDef<PersistedJob>[],
		[t, isServerOwner],
	)

	return (
		<Card className="bg-background-surface p-1">
			<Table
				sortable
				columns={columns}
				options={{
					debugColumns: DEBUG,
					debugHeaders: DEBUG,
					debugTable: DEBUG,
					enableSorting: false,
					manualPagination: true,
					onPaginationChange: setPagination,
					pageCount,
					state: {
						columnPinning: { right: ['actions'] },
						pagination,
					},
				}}
				data={jobs}
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
				cellClassName="bg-background-surface"
			/>

			<JobDataInspector data={inspectingData} onClose={() => setInspectingData(null)} />
		</Card>
	)
}
