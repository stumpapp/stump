import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../SettingsLayout'
import DisplaySpacingPreference from './DisplaySpacingPreference'
import DoubleSidebarToggle from './DoubleSidebarToggle'
import PreferColorToggle from './PreferColorToggle'
import PrimaryNavigationPreference from './PrimaryNavigationPreference'
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
				<ThemeSelect />
				<PrimaryNavigationPreference />

				<div className="flex flex-col gap-y-8">
					<DoubleSidebarToggle />
					<ReplacePrimarySidebarToggle />
				</div>

				<DisplaySpacingPreference />

				<div className="flex flex-col gap-y-8">
					<PreferColorToggle />
					<QueryIndicatorToggle />
				</div>
			</SettingsContent>
		</SceneContainer>
	)
}
