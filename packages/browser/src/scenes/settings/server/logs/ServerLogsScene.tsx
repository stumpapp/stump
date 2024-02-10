import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

import { LiveLogsSection } from './live-logs'
import { PersistedLogsSection } from './persisted-logs'

export default function ServerLogsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/logs.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<PersistedLogsSection />
				<LiveLogsSection />
			</ContentContainer>
		</SceneContainer>
	)
}
