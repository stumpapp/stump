import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer, SceneContainer } from '@/components/container'

import { DevicesSection } from './devices'
import { EmailersSection } from './emailers'

export default function EmailSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/email.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-12">
					<EmailersSection />
					<DevicesSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
