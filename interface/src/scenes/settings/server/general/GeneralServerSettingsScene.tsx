import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import LibrariesStats from '@/components/library/LibrariesStats'
import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/general.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-4">
					<LibrariesStats />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
