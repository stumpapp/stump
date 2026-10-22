import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import OptionalFeaturesSection from './features'

export default function DesktopSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<Helmet>
				<title>Stump | {t('settingsScene.app/desktop.helmet')}</title>
			</Helmet>

			<OptionalFeaturesSection />
		</SceneContainer>
	)
}
