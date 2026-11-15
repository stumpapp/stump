import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'
import { AppTitle } from '@/AppTitle'

import { LiveLogsSection } from './live-logs'
import { PersistedLogsSection } from './persisted-logs'

export default function ServerLogsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/logs.helmet')} />

			<PersistedLogsSection />
			<LiveLogsSection />
		</SceneContainer>
	)
}
