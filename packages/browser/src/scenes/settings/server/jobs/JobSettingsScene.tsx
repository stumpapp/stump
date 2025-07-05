import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import ContentContainer from '@/components/container/ContentContainer.tsx'

import DeleteAllSection from './DeleteAllSection.tsx'
import JobScheduler from './JobScheduler.tsx'
import JobTable from './JobTable.tsx'

export default function JobSettingsScene() {
	const { t } = useLocaleContext()

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

					{/* <JobScheduler /> */}
				</div>

				<div className="flex flex-col gap-4">
					<div>
						<Heading size="sm">{t('settingsScene.server/jobs.sections.history.title')}</Heading>
						<Text size="sm" variant="muted" className="mt-1">
							{t('settingsScene.server/jobs.sections.history.description')}
						</Text>
					</div>

					<Suspense>
						<JobTable />
					</Suspense>

					{/* <JobTable />
						<DeleteAllSection /> */}
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
