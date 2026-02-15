import { Platform, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import {
	AppLanguage,
	AppTheme,
	AutoSyncLocalData,
	DefaultServer,
	DeleteDatabase,
	ImageCacheActions,
	MaskURLs,
	PerformanceMonitor,
	PreferNativePdf,
	ReaderSettingsLink,
	ReduceAnimations,
	ThumbnailPlaceholder,
	ThumbnailRatio,
} from '~/components/appSettings/preferences'
import AppPrimaryColor from '~/components/appSettings/preferences/AppPrimaryColor'
import DisableDismissGesture from '~/components/appSettings/preferences/DisableDismissGesture'
import { StumpEnabled } from '~/components/appSettings/stump'
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
				</Card>

				<Card label="Reading">
					<PreferNativePdf />
					{Platform.OS === 'ios' && <DisableDismissGesture />}
					<ReaderSettingsLink />
				</Card>

				<Card
					label="Stump"
					description="Stump features are optional, you can completely turn them off if you just want OPDS support"
				>
					<StumpEnabled />
					<AutoSyncLocalData />
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
				</Card>

				<ContactInformation />

				<SupportInformation />
			</View>
		</ScrollView>
	)
}
