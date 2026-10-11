import { Helmet } from 'react-helmet'

import { ContentContainer, SceneContainer } from '@/components/container'
import { ExperimentalFeatureDisclaimer } from '@/components/ExperimentalFeatureDisclaimer'
import { PendingMatchesSection } from '@/components/metadata/metadataMatching'
import { useTranslate } from '@/hooks/useTranslate'

import { ProvidersSection } from './providers'

export default function GeneralServerSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/metadataIntegrations.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<ExperimentalFeatureDisclaimer />
				<div className="gap-12 flex flex-col">
					<ProvidersSection />
					<PendingMatchesSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
