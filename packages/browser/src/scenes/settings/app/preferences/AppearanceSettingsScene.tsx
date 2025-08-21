import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'

import DebugSettings from './DebugSettings'
import DisplaySpacingPreference from './DisplaySpacingPreference'
import EnableAlphabetFiltering from './EnableAlphabetFiltering'
import EnableJobOverlayToggle from './EnableJobOverlayToggle'
import FontSelect from './FontSelect'
import GradientToggle from './GradientToggle'
import HideScrollbarToggle from './HideScrollbarToggle'
import LiveRefetchToggle from './LiveRefetchToggle'
import MaxWidthPreference from './MaxWidthPreference'
import { NavigationArrangement } from './navigation-arrangement'
import PrimaryNavigationPreference from './PrimaryNavigationPreference'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import { DoubleSidebarToggle, ReplacePrimarySidebarToggle } from './settings-sidebar'
import ShowThumbnailsInHeader from './ShowThumbnailsInHeader'
import ThemeSelect from './ThemeSelect'

// TODO: The more I look at this the less I kinda like it

export default function AppearanceSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<Container>
			<Helmet>
				<title>Stump | {t('settingsScene.app/preferences.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<DebugSettings />

				<div className="flex flex-col gap-y-8">
					<div>
						<h3 className="text-base font-medium text-foreground">Theme and appearance</h3>
						<p className="text-sm text-foreground-muted">
							The basic look and feel options for Stump
						</p>
					</div>

					<ThemeSelect />
					<GradientToggle />
					<FontSelect />
				</div>

				<div>
					<h3 className="text-base font-medium text-foreground">Layout and arrangement</h3>
					<p className="text-sm text-foreground-muted">
						Customize how Stump displays information and organizes content
					</p>
				</div>

				<PrimaryNavigationPreference />

				<div className="flex flex-col gap-y-8">
					<DoubleSidebarToggle />
					<ReplacePrimarySidebarToggle />
				</div>

				<Suspense>
					<NavigationArrangement />
				</Suspense>

				<DisplaySpacingPreference />
				<MaxWidthPreference />

				<div className="flex flex-col gap-y-8">
					<div>
						<h3 className="text-base font-medium text-foreground">Additional preferences</h3>
						<p className="text-sm text-foreground-muted">
							Customize the appearance and behavior of Stump with these additional settings
						</p>
					</div>
					<ShowThumbnailsInHeader />
					<HideScrollbarToggle />
					<EnableAlphabetFiltering />
					<QueryIndicatorToggle />
					<LiveRefetchToggle />
					<EnableJobOverlayToggle />
				</div>
			</ContentContainer>
		</Container>
	)
}
