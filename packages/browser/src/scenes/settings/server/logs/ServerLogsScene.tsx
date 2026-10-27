import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import { LiveLogsSection } from './live-logs'
import { PersistedLogsSection } from './persisted-logs'

export default function ServerLogsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<Helmet>
				<title>Stump | {t('settingsScene.server/logs.helmet')}</title>
			</Helmet>

			<PersistedLogsSection />
			<LiveLogsSection />
		</SceneContainer>
	)
}
