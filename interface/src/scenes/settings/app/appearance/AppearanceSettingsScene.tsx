import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../SettingsLayout'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import ThemeSelect from './ThemeSelect'

export default function AppearanceSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/appearance.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<ThemeSelect />
				<QueryIndicatorToggle />
			</SettingsContent>
		</SceneContainer>
	)
}
