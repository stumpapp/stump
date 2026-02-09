import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { Container, ContentContainer } from '@/components/container'

import DebugSettings from './DebugSettings'
import DisplaySpacingPreference from './DisplaySpacingPreference'
import EnableAlphabetFiltering from './EnableAlphabetFiltering'
import EnableFancyAnimations from './EnableFancyAnimations'
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
import ThumbnailPlaceholder from './ThumbnailPlaceholder'
import ThumbnailRatioSelect from './ThumbnailRatioSelect'

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
						<h3 className="text-base font-medium text-foreground">
							{t(getKey('themeAndAppearance.label'))}
						</h3>
						<p className="text-sm text-foreground-muted">
							{t(getKey('themeAndAppearance.description'))}
						</p>
					</div>

					<ThemeSelect />
					<GradientToggle />
					<FontSelect />
					<ThumbnailRatioSelect />
					<ThumbnailPlaceholder />
				</div>

				<div>
					<h3 className="text-base font-medium text-foreground">
						{t(getKey('layoutAndArrangement.label'))}
					</h3>
					<p className="text-sm text-foreground-muted">
						{t(getKey('layoutAndArrangement.description'))}
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
						<h3 className="text-base font-medium text-foreground">
							{t(getKey('additionalPreferences.label'))}
						</h3>
						<p className="text-sm text-foreground-muted">
							{t(getKey('additionalPreferences.description'))}
						</p>
					</div>
					<ShowThumbnailsInHeader />
					<HideScrollbarToggle />
					<EnableAlphabetFiltering />
					<EnableFancyAnimations />
					<QueryIndicatorToggle />
					<LiveRefetchToggle />
					<EnableJobOverlayToggle />
				</div>
			</ContentContainer>
		</Container>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
