import React from 'react'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'
import { useLocaleContext } from '@/i18n'

import DisplaySpacingPreference from './DisplaySpacingPreference'
import DoubleSidebarToggle from './DoubleSidebarToggle'
import HideScrollbarToggle from './HideScrollbarToggle'
import MaxWidthPreference from './MaxWidthPreference'
import PreferColorToggle from './PreferColorToggle'
import PrimaryNavigationPreference from './PrimaryNavigationPreference'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import ReplacePrimarySidebarToggle from './ReplacePrimarySidebarToggle'
import ShowThumbnailsInHeader from './ShowThumbnailsInHeader'
import ThemeSelect from './ThemeSelect'

export default function AppearanceSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<Container>
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
					<ShowThumbnailsInHeader />
					<PreferColorToggle />
					<HideScrollbarToggle />
					<QueryIndicatorToggle />
				</div>
			</ContentContainer>
		</Container>
	)
}
