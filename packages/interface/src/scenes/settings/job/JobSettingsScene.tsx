import { useJobContext } from '@stump/client'
import { useJobsQuery } from '@stump/client/queries/job'
import { Heading, Text } from '@stump/components'
import { PaginationState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'
import { JobSettingsContext } from './context'
import JobTable from './JobTable'

export default function JobSettingsScene() {
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
			<SceneContainer>
				<Helmet>
					<title>Stump | {t('settingsScene.jobs.helmet')}</title>
				</Helmet>

				<Heading>{t('settingsScene.jobs.heading')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.jobs.subtitle')}
				</Text>

				<JobTable />
			</SceneContainer>
		</JobSettingsContext.Provider>
	)
}
