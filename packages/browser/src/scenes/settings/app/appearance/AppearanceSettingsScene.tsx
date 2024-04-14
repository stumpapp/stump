import { useLocaleContext } from '@stump/i18n'
import React, { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'

import DisplaySpacingPreference from './DisplaySpacingPreference'
import HideScrollbarToggle from './HideScrollbarToggle'
import LiveRefetchToggle from './LiveRefetchToggle'
import MaxWidthPreference from './MaxWidthPreference'
import { NavigationArrangement } from './navigation-arrangement'
import PreferColorToggle from './PreferColorToggle'
import PrimaryNavigationPreference from './PrimaryNavigationPreference'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import { DoubleSidebarToggle, ReplacePrimarySidebarToggle } from './settings-sidebar'
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
				</div>

				<Suspense fallback={null}>
					<NavigationArrangement />
				</Suspense>

				<DisplaySpacingPreference />
				<MaxWidthPreference />

				<div className="flex flex-col gap-y-8">
					<ShowThumbnailsInHeader />
					<PreferColorToggle />
					<HideScrollbarToggle />
					<QueryIndicatorToggle />
					<LiveRefetchToggle />
				</div>
			</ContentContainer>
		</Container>
	)
}
