import { Heading, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import ContentContainer from '@/components/container/ContentContainer.tsx'
import { useAppContext } from '@/context'

import DeleteJobHistoryConfirmation from './DeleteJobHistoryConfirmation.tsx'
import JobScheduler from './JobScheduler.tsx'
import JobTable from './JobTable.tsx'

export default function JobSettingsScene() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canManageJobs = checkPermission(UserPermission.ManageJobs)

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/jobs.helmet')}</title>
			</Helmet>

			{/* 
					TODO(aaron): on mobile only, add a section for managing the running job. Doing it all 
					through the table on mobile would prolly suck
				*/}

			<ContentContainer>
				<div className="flex flex-col gap-4">
					<div>
						<Heading size="sm">{t('settingsScene.server/jobs.sections.scheduling.title')}</Heading>
						<Text size="sm" variant="muted" className="mt-1">
							{t('settingsScene.server/jobs.sections.scheduling.description')}
						</Text>
					</div>

					<Suspense>
						<JobScheduler />
					</Suspense>
				</div>

				<div className="flex flex-col gap-4">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">{t('settingsScene.server/jobs.sections.history.title')}</Heading>
							<Text size="sm" variant="muted" className="mt-1">
								{t('settingsScene.server/jobs.sections.history.description')}
							</Text>
						</div>

						{canManageJobs && <DeleteJobHistoryConfirmation />}
					</div>

					<Suspense>
						<JobTable />
					</Suspense>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
