import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

import DiscordPresenceSwitch from './DiscordPresenceSwitch'

export default function DesktopSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/desktop.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<DiscordPresenceSwitch />
			</ContentContainer>
		</SceneContainer>
	)
}
