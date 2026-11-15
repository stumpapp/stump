import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'
import { AppTitle } from '@/AppTitle'

import { DevicesSection } from './devices'
import { EmailersSection } from './emailers'

export default function EmailSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/email.helmet')} />

			<div className="gap-12 flex flex-col">
				<EmailersSection />
				<DevicesSection />
			</div>
		</SceneContainer>
	)
}
