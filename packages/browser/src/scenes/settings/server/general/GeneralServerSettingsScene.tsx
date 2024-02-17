import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import LibraryStats from '@/components/library/LibraryStats'
import { useLocaleContext } from '@/i18n'

import ServerInfoSection from './ServerInfoSection'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/general.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<LibraryStats />
				<ServerInfoSection />
			</ContentContainer>
		</SceneContainer>
	)
}
