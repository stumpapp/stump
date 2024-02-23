import { useCheckForServerUpdate } from '@stump/client'
import { Alert } from '@stump/components'
import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

import ServerInfoSection from './ServerInfoSection'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()

	const { updateAvailable } = useCheckForServerUpdate()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/general.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-12">
					{updateAvailable && (
						<Alert level="warning" rounded="sm" icon="warning">
							<Alert.Content>
								{t('settingsScene.server/general.sections.updateAvailable.message')}
							</Alert.Content>
						</Alert>
					)}

					<ServerInfoSection />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
