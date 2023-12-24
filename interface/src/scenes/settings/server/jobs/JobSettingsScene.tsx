import { useJobContext, useJobsQuery } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { PaginationState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'
import { useAppContext } from '@/context'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../SettingsLayout.tsx'
import { JobSettingsContext } from './context.ts'
import DeleteAllSection from './DeleteAllSection.tsx'
import JobScheduler from './JobScheduler.tsx'
import JobTable from './JobTable.tsx'

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
			direction: 'desc',
			order_by: 'created_at',
			zero_based: true,
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
				pageCount: pageData?.total_pages ?? 1,
				pagination,
				setPagination,
			}}
		>
			<SceneContainer>
				<Helmet>
					<title>Stump | {t('settingsScene.server/jobs.helmet')}</title>
				</Helmet>

				{/* 
					TODO(aaron): on mobile only, add a section for managing the running job. Doing it all 
					through the table on mobile would prolly suck
				*/}

				<SettingsContent>
					<div className="flex flex-col gap-4">
						<div>
							<Heading size="sm">
								{t('settingsScene.server/jobs.sections.scheduling.title')}
							</Heading>
							<Text size="sm" variant="muted" className="mt-1">
								{t('settingsScene.server/jobs.sections.scheduling.description')}
							</Text>
						</div>

						<JobScheduler />
					</div>

					<div className="flex flex-col gap-4">
						<div>
							<Heading size="sm">{t('settingsScene.server/jobs.sections.history.title')}</Heading>
							<Text size="sm" variant="muted" className="mt-1">
								{t('settingsScene.server/jobs.sections.history.description')}
							</Text>
						</div>

						<JobTable />
						<DeleteAllSection />
					</div>
				</SettingsContent>
			</SceneContainer>
		</JobSettingsContext.Provider>
	)
}
