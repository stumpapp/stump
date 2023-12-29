import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import DisplaySpacingPreference from './DisplaySpacingPreference'
import DoubleSidebarToggle from './DoubleSidebarToggle'
import MaxWidthPreference from './MaxWidthPreference'
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

			<ContentContainer>
				<ThemeSelect />
				<PrimaryNavigationPreference />

				<div className="flex flex-col gap-y-8">
					<DoubleSidebarToggle />
					<ReplacePrimarySidebarToggle />

					<MaxWidthPreference />
				</div>

				<DisplaySpacingPreference />

				<div className="flex flex-col gap-y-8">
					<PreferColorToggle />
					<QueryIndicatorToggle />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
