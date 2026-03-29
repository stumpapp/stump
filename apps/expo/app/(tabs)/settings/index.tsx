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

export default function Screen() {
	return (
		<ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
			<View className="flex-1 gap-8 bg-background p-4 tablet:p-6">
				<Card label="Preferences">
					<AppTheme />
					<AppPrimaryColor />
					<AppLanguage />
					<DefaultServer />
					<ThumbnailRatio />
					<ThumbnailPlaceholder />
					<ThumbnailResizeMode />
				</Card>

				<Card label="Reading">
					<PreferNativePdf />
					<PreferMinimalReader />
					{Platform.OS === 'ios' && <DisableDismissGesture />}
					<ReaderSettingsLink />
				</Card>

				<Card
					label="Stump"
					description="Stump features are optional, you can completely turn them off if you just want OPDS support"
				>
					<StumpEnabled />
					<AutoSyncLocalData />
					<BookClubsEnabled />
				</Card>

				<Card label="Management">
					<AppDataUsageLink />
				</Card>

				<Card label="Debug">
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
