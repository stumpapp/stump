import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import OptionalFeaturesSection from './features'

export default function DesktopSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.app/desktop.helmet')} />

			<OptionalFeaturesSection />
		</SceneContainer>
	)
}
