import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import {
	AppLanguage,
	AppTheme,
	DefaultServer,
	ImageCacheActions,
	MaskURLs,
	PerformanceMonitor,
	ReaderSettingsLink,
	ReduceAnimations,
	ThumbnailRatio,
} from '~/components/appSettings/preferences'
import AppPrimaryColor from '~/components/appSettings/preferences/AppPrimaryColor'
import { StumpEnabled } from '~/components/appSettings/stump'
import { Text } from '~/components/ui/text'

export default function Screen() {
	return (
		<ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
			<View className="flex-1 gap-8 bg-background p-4 tablet:p-6">
				<View>
					<Text className="mb-3 text-foreground-muted">Preferences</Text>
					<AppTheme />
					<AppPrimaryColor />
					<AppLanguage />
					<DefaultServer />
					<ThumbnailRatio />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Reading</Text>

					<ReaderSettingsLink />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Stump</Text>

					<View className="squircle mb-2 rounded-xl bg-fill-info-secondary p-2 tablet:p-3">
						<Text className="text-fill-info">
							Stump features are optional, you can completely turn them off if you just want OPDS
							support
						</Text>
					</View>

					<StumpEnabled />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Management</Text>
					<AppDataUsageLink />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Debug</Text>
					<ImageCacheActions />
					<PerformanceMonitor />
					<ReduceAnimations />
					<MaskURLs />
				</View>

				<ContactInformation />

				<SupportInformation />
			</View>
		</ScrollView>
	)
}
