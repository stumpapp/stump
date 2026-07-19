import { NewCard } from '@stump/components'
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
import InterfaceRoundnessPreference from './InterfaceRoundnessPreference'
import LiveRefetchToggle from './LiveRefetchToggle'
import MaxWidthPreference from './MaxWidthPreference'
import { NavigationArrangement } from './navigation-arrangement'
import PrimaryNavigationPreference from './PrimaryNavigationPreference'
import QueryIndicatorToggle from './QueryIndicatorToggle'
import { DoubleSidebarToggle, ReplacePrimarySidebarToggle } from './settings-sidebar'
import ThemeSelect from './ThemeSelect'
import ThumbnailAppearancePreference from './ThumbnailAppearancePreference'

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

				<div className="gap-y-8 flex flex-col">
					<div>
						<h3 className="text-base font-medium text-foreground">
							{t(getKey('themeAndAppearance.label'))}
						</h3>
						<p className="text-sm text-muted-foreground">
							{t(getKey('themeAndAppearance.description'))}
						</p>
					</div>

					<NewCard
						label={t(getKey('interface.title'))}
						description={t(getKey('interface.description'))}
					>
						<ThemeSelect />
						<GradientToggle />
						<FontSelect />
						<InterfaceRoundnessPreference />
					</NewCard>

					<NewCard
						label={t(getKey('thumbnails.title'))}
						description={t(getKey('thumbnails.description'))}
					>
						<ThumbnailAppearancePreference />
					</NewCard>
				</div>

				<div className="gap-y-8 flex flex-col">
					<div>
						<h3 className="text-base font-medium text-foreground">
							{t(getKey('layoutAndArrangement.label'))}
						</h3>
						<p className="text-sm text-muted-foreground">
							{t(getKey('layoutAndArrangement.description'))}
						</p>
					</div>

					<NewCard
						label={t(getKey('navigation.title'))}
						description={t(getKey('navigation.description'))}
					>
						<PrimaryNavigationPreference />
						<DoubleSidebarToggle />
						<ReplacePrimarySidebarToggle />
						<Suspense>
							<NavigationArrangement />
						</Suspense>
					</NewCard>

					<NewCard
						label={t(getKey('displayAndSpacing.label'))}
						description={t(getKey('displayAndSpacing.description'))}
					>
						<DisplaySpacingPreference />
						<MaxWidthPreference />
					</NewCard>
				</div>

				<div className="gap-y-8 flex flex-col">
					<div>
						<h3 className="text-base font-medium text-foreground">
							{t(getKey('additionalPreferences.label'))}
						</h3>
						<p className="text-sm text-muted-foreground">
							{t(getKey('additionalPreferences.description'))}
						</p>
					</div>

					<NewCard
						label={t(getKey('contentBrowsing.label'))}
						description={t(getKey('contentBrowsing.description'))}
					>
						<EnableAlphabetFiltering />
					</NewCard>

					<NewCard
						label={t(getKey('motionAndAnimation.label'))}
						description={t(getKey('motionAndAnimation.description'))}
					>
						<EnableFancyAnimations />
						<HideScrollbarToggle />
					</NewCard>

					<NewCard
						label={t(getKey('activityAndStatus.label'))}
						description={t(getKey('activityAndStatus.description'))}
					>
						<QueryIndicatorToggle />
						<LiveRefetchToggle />
						<EnableJobOverlayToggle />
					</NewCard>
				</div>
			</ContentContainer>
		</Container>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
