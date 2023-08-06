import { useJobContext } from '@stump/client'
import { useJobsQuery } from '@stump/client/queries/job'
import { Divider, Heading, Text } from '@stump/components'
import { PaginationState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context.ts'
import { useLocaleContext } from '../../../i18n'
import { JobSettingsContext } from './context'
import DeleteAllSection from './DeleteAllSection.tsx'
import JobScheduler from './JobScheduler'
import JobTable from './JobTable'

export default function JobSettingsScene() {
	const { isServerOwner } = useAppContext()
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const { t } = useLocaleContext()

	const { activeJobs } = useJobContext() ?? {}

	const {
		jobs: dbJobs,
		isRefetching,
		pageData,
	} = useJobsQuery({
		enabled: isServerOwner,
		page: pagination.pageIndex,
		page_size: pagination.pageSize,
		params: {
			order_by: 'created_at',
			order_direction: 'desc',
		},
	})

	const jobs = useMemo(() => {
		// active jobs has the task progress information, so we need to merge that
		// with the jobs from the database.
		return (dbJobs ?? []).map((job) => {
			const activeJob = activeJobs?.[job.id]
			if (!activeJob) return job

			return {
				...job,
				completed_task_count: Number(activeJob.current_task),
				status: activeJob.status ?? job.status,
				task_count: Number(activeJob.task_count),
			}
		})
	}, [dbJobs, activeJobs])

	return (
		<JobSettingsContext.Provider
			value={{
				isRefetchingJobs: isRefetching,
				jobs,
				pageCount: pageData?.total_pages ?? jobs.length ? 1 : 0,
				pagination,
				setPagination,
			}}
		>
			<SceneContainer className="flex flex-col gap-6">
				<Helmet>
					<title>Stump | {t('settingsScene.jobs.helmet')}</title>
				</Helmet>

				<div className="mb-2">
					<Heading>{t('settingsScene.jobs.heading')}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.jobs.subtitle')}
					</Text>
				</div>

				<div>
					<Heading size="xs">{t('settingsScene.jobs.schedulingHeading')}</Heading>
					<Text size="sm" variant="muted" className="mt-1.5">
						{t('settingsScene.jobs.schedulingSubtitle')}
					</Text>

					<Divider variant="muted" className="my-3.5" />
				</div>
				<JobScheduler />

				<div>
					<Heading size="xs">{t('settingsScene.jobs.historyHeading')}</Heading>
					<Text size="sm" variant="muted" className="mt-1.5">
						{t('settingsScene.jobs.historySubtitle')}
					</Text>

					<Divider variant="muted" className="my-3.5" />
				</div>
				<JobTable />
				<DeleteAllSection />
			</SceneContainer>
		</JobSettingsContext.Provider>
	)
}
