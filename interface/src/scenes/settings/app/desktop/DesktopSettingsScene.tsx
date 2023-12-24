import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'

import { useLocaleContext } from '../../../../i18n'
import { SettingsContent } from '../../SettingsLayout'
import DiscordPresenceSwitch from './DiscordPresenceSwitch'

export default function DesktopSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/desktop.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<DiscordPresenceSwitch />
			</SettingsContent>
		</SceneContainer>
	)
}
