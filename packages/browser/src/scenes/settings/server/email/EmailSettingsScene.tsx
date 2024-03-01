import { Alert } from '@stump/components'
import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer, SceneContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

export default function EmailSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/email.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-12">
					<Alert level="warning" rounded="sm" icon="warning">
						<Alert.Content>
							{t('settingsScene.server/email.sections.singleInstanceDisclaimer')}
						</Alert.Content>
					</Alert>

					{/* <ServerInfoSection /> */}
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
