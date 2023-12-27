import React from 'react'
import { Helmet } from 'react-helmet'

import LibrariesStats from '@/components/library/LibrariesStats'
import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../SettingsLayout'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/general.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<div className="flex flex-col gap-4">
					<LibrariesStats />
				</div>
			</SettingsContent>
		</SceneContainer>
	)
}
