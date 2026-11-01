import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import { DevicesSection } from './devices'
import { EmailersSection } from './emailers'

export default function EmailSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<Helmet>
				<title>Stump | {t('settingsScene.server/email.helmet')}</title>
			</Helmet>

			<div className="gap-12 flex flex-col">
				<EmailersSection />
				<DevicesSection />
			</div>
		</SceneContainer>
	)
}
