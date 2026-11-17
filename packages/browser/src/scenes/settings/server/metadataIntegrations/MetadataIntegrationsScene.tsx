import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { ExperimentalFeatureDisclaimer } from '@/components/ExperimentalFeatureDisclaimer'
import { PendingMatchesSection } from '@/components/metadata/metadataMatching'
import { useTranslate } from '@/hooks/useTranslate'

import { ProvidersSection } from './providers'

export default function GeneralServerSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/metadataIntegrations.helmet')} />

			<ExperimentalFeatureDisclaimer />

			<div className="gap-12 flex flex-col">
				<ProvidersSection />
				<PendingMatchesSection />
			</div>
		</SceneContainer>
	)
}
