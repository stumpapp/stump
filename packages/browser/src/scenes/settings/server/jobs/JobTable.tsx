import { useJobStore, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Card, Heading, Text } from '@stump/components'
import { graphql, JobStatus, JobTableQuery, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Api } from '@stump/sdk'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { ColumnDef, createColumnHelper, PaginationState } from '@tanstack/react-table'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CircleSlash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Table } from '@/components/table'
import { useAppContext } from '@/context'

import JobActionMenu from './JobActionMenu.tsx'
import JobDataInspector, { JobDataInspectorFragment } from './JobDataInspector.tsx'
import RunningJobElapsedTime from './RunningJobElapsedTime.tsx'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const LOCALE_BASE = 'settingsScene.server/jobs.sections.history.table'

const query = graphql(`
	query JobTable($pagination: Pagination!) {
		jobs(pagination: $pagination) {
			nodes {
				id
				name
				description
				status
				createdAt
				completedAt
				msElapsed
				outputData {
					...JobDataInspector
				}
				logCount
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					currentPage
					totalPages
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export const prefetchJobs = (client: QueryClient, sdk: Api) =>
	client.prefetchQuery({
		queryKey: sdk.cacheKey('jobs', [{ pagination: { offset: { page: 1, pageSize: 10 } } }]),
		queryFn: async () => {
			const response = await sdk.execute(query, {
				pagination: {
					offset: {
						page: 1,
						pageSize: 10,
					},
				},
			})
			return response
		},
	})

export type PersistedJob = JobTableQuery['jobs']['nodes'][number]

const columnHelper = createColumnHelper<PersistedJob>()

export default function JobTable() {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})
	const storeJobs = useJobStore((state) => state.jobs)

	const { checkPermission } = useAppContext()
	const { t } = useLocaleContext()

	const canManageJobs = checkPermission(UserPermission.ManageJobs)

	const client = useQueryClient()
	const { sdk } = useSDK()
	const {
		data: {
			jobs: { nodes: dbJobs, pageInfo },
		},
		isRefetching,
	} = useSuspenseGraphQL(query, sdk.cacheKey('jobs', [pagination]), {
		pagination: {
			offset: {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
			},
		},
	})

	if (pageInfo.__typename !== 'OffsetPaginationInfo') {
		throw new Error('Expected OffsetPaginationInfo for job pagination')
	}

	const prefetchPage = useCallback(
		(page: number) => {
			return client.prefetchQuery({
				queryKey: sdk.cacheKey('jobs', [
					{
						pageIndex: page - 1,
						pageSize: pagination.pageSize,
					},
				]),
				queryFn: async () => {
					const response = await sdk.execute(query, {
						pagination: {
							offset: {
								page,
								pageSize: pagination.pageSize,
							},
						},
					})
					return response
				},
			})
		},
		[client, pagination.pageSize, sdk],
	)

	const jobs = useMemo(() => {
		// active jobs has the task progress information, so we need to merge that
		// with the jobs from the database.
		return (dbJobs ?? []).map((job) => {
			const activeJob = storeJobs?.[job.id]
			if (!activeJob) return job

			return {
				...job,
				status: activeJob.status ?? job.status,
			}
		})
	}, [dbJobs, storeJobs])

	const [inspectingData, setInspectingData] = useState<JobDataInspectorFragment | null>()

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
				columnHelper.accessor('createdAt', {
					cell: ({ row: { original: job } }) => {
						if (job.createdAt) {
							return (
								<Text size="sm" variant="muted" className="line-clamp-1">
									{dayjs(job.createdAt).format('YYYY-MM-DD HH:mm:ss')}
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
						} else if (!isRunningOrQueued && job.msElapsed !== null) {
							return (
								<Text size="sm" variant="muted" className="line-clamp-1">
									{displayDuration(dayjs.duration(Number(job.msElapsed)))}
								</Text>
							)
						}

						return null
					},
					header: t(`${LOCALE_BASE}.columns.elapsed`),
					id: 'msElapsed',
				}),
				columnHelper.display({
					cell: ({ row }) =>
						canManageJobs ? (
							<JobActionMenu job={row.original} onInspectData={setInspectingData} />
						) : null,
					id: 'actions',
					size: 28,
				}),
			] as ColumnDef<PersistedJob>[],
		[t, canManageJobs],
	)

	const EmptyState = useCallback(
		() =>
			isRefetching ? null : (
				<div className="flex min-h-[150px] flex-col items-center justify-center gap-2">
					<CircleSlash2 className="h-10 w-10 pb-2 pt-1 text-foreground-muted" />
					<Heading size="sm">{t(`${LOCALE_BASE}.emptyHeading`)}</Heading>
					<Text size="sm" variant="muted">
						{t(`${LOCALE_BASE}.emptySubtitle`)}
					</Text>
				</div>
			),
		[isRefetching, t],
	)

	return (
		<Card>
			<Table
				sortable
				columns={columns}
				options={{
					enableSorting: false,
					manualPagination: true,
					onPaginationChange: setPagination,
					pageCount: pageInfo.totalPages ?? 1,
					state: {
						columnPinning: { right: ['actions'] },
						pagination,
					},
				}}
				data={jobs}
				fullWidth
				emptyRenderer={EmptyState}
				isZeroBasedPagination
				cellClassName="bg-background"
				onPrefetchPage={prefetchPage}
			/>

			<JobDataInspector data={inspectingData} onClose={() => setInspectingData(null)} />
		</Card>
	)
}
