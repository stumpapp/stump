import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import DiscordPresenceSwitch from './DiscordPresenceSwitch'

export default function DesktopSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.desktop.helmet')}</title>
			</Helmet>

			<SettingsHeading
				heading={t('settingsScene.desktop.heading')}
				subtitle={t('settingsScene.desktop.subtitle')}
			/>

			<SettingsContent>
				<DiscordPresenceSwitch />
			</SettingsContent>
		</SceneContainer>
	)
}
