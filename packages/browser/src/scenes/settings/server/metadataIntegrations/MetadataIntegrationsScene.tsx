import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { ContentContainer, SceneContainer } from '@/components/container'

import { ProvidersSection } from './providers'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/metadataIntegrations.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-12">
					<ProvidersSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
