import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'

import OptionalFeaturesSection from './features'

export default function DesktopSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/desktop.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<OptionalFeaturesSection />
			</ContentContainer>
		</SceneContainer>
	)
}
