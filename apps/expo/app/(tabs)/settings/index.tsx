import { Platform, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

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
	EnableDebugAnalytics,
	ImageCacheActions,
	MaskURLs,
	PerformanceMonitor,
	PreferMinimalReader,
	PreferNativePdf,
	ReaderSettingsLink,
	ReduceAnimations,
	ThumbnailPlaceholder,
	ThumbnailRatio,
	ThumbnailResizeMode,
} from '~/components/appSettings/preferences'
import { BookClubsEnabled, StumpEnabled } from '~/components/appSettings/stump'
import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

export default function Screen() {
	const { t } = useTranslate()

	return (
		<ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
			<View className="gap-8 p-4 tablet:p-6 flex-1 bg-background">
				<Card label={t(getSectionLabelKey('preferences'))}>
					<AppTheme />
					<AppPrimaryColor />
					<AppLanguage />
					<DefaultServer />
					<ThumbnailRatio />
					<ThumbnailPlaceholder />
					<ThumbnailResizeMode />
				</Card>

				<Card label={t(getSectionLabelKey('reading'))}>
					<PreferNativePdf />
					<PreferMinimalReader />
					{Platform.OS === 'ios' && <DisableDismissGesture />}
					<ReaderSettingsLink />
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
					<EnableDebugAnalytics />
				</Card>

				<ContactInformation />

				<SupportInformation />
			</View>
		</ScrollView>
	)
}

const getSectionKey = (section: string, key: string) => `settings.${section}.${key}`
const getSectionLabelKey = (section: string) => `${getSectionKey(section, 'label')}`
