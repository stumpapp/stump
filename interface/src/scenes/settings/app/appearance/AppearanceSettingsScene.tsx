import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../SettingsLayout'
import DisplayAppearanceSettings from './DisplayAppearanceSettings'
import DoubleSidebarToggle from './DoubleSidebarToggle'
import PreferColorToggle from './PreferColorToggle'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import ReplacePrimarySidebarToggle from './ReplacePrimarySidebarToggle'
import ThemeSelect from './ThemeSelect'

export default function AppearanceSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/appearance.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<DisplayAppearanceSettings />
				<ThemeSelect />

				<div className="flex flex-col gap-y-8">
					<PreferColorToggle />
					<QueryIndicatorToggle />
					<DoubleSidebarToggle />
					<ReplacePrimarySidebarToggle />
				</div>
			</SettingsContent>
		</SceneContainer>
	)
}
