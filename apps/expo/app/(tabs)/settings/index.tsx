import { Platform, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import {
	AppLanguage,
	AppPrimaryColor,
	AppTheme,
	AutoSyncLocalData,
	DefaultServer,
	DeleteDatabase,
	DisableDismissGesture,
	DisplayLanguageKeys,
	EnableDebugAnalytics,
	EpubSettings,
	GlobalIncognito,
	ImageCacheActions,
	ImageReaderSettings,
	MaskURLs,
	MaxPageViewingSeconds,
	PerformanceMonitor,
	PreferMinimalReader,
	PreferNativePdf,
	ReduceAnimations,
	TextCasePreference,
	ThumbnailPlaceholder,
	ThumbnailRatio,
	ThumbnailResizeMode,
	TintListBackground,
} from '~/components/appSettings/preferences'
import { BookClubsEnabled, StumpEnabled } from '~/components/appSettings/stump'
import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export default function Screen() {
	const { t } = useTranslate()

	return (
		<KeyboardAwareScrollView
			className="flex-1 bg-background"
			contentInsetAdjustmentBehavior="automatic"
			// this is for MaxPageViewingSeconds:
			// gap between keyboard and KeyboardDraftNumberToolbar + KeyboardDraftNumberToolbar height + gap to TextInput
			bottomOffset={7 + 49 + 10}
		>
			<View className="gap-8 p-4 tablet:p-6 flex-1 bg-background">
				<Card label={t(getSectionLabelKey('preferences'))}>
					<AppTheme />
					<AppPrimaryColor />
					<AppLanguage />
					<TextCasePreference />
					<DefaultServer />
					<ThumbnailRatio />
					<ThumbnailPlaceholder />
					<ThumbnailResizeMode />
					<TintListBackground />
				</Card>

				<Card label={t(getSectionLabelKey('reading'))}>
					<PreferNativePdf />
					<PreferMinimalReader />
					{Platform.OS === 'ios' && <DisableDismissGesture />}
					<MaxPageViewingSeconds />
					<GlobalIncognito />
					<ImageReaderSettings />
					<EpubSettings />
				</Card>

				<Card
					label={t(getSectionLabelKey('stump'))}
					description={t(getSectionKey('stump', 'description'))}
				>
					<StumpEnabled />
					<AutoSyncLocalData />
					<BookClubsEnabled />
				</Card>

				<Card label={t(getSectionLabelKey('management'))}>
					<AppDataUsageLink />
				</Card>

				<Card label={t(getSectionLabelKey('debug'))}>
					<ImageCacheActions />
					{__DEV__ && <DeleteDatabase />}
					<PerformanceMonitor />
					<ReduceAnimations />
					<MaskURLs />
					<DisplayLanguageKeys />
					<EnableDebugAnalytics />
				</Card>

				<ContactInformation />

				<SupportInformation />
			</View>
		</KeyboardAwareScrollView>
	)
}

const getSectionKey = (section: string, key: string) => `settings.${section}.${key}`
const getSectionLabelKey = (section: string) => `${getSectionKey(section, 'label')}`
