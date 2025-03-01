import {
	Header,
	LargeHeader,
	ScalingView,
	ScrollHeaderProps,
	ScrollLargeHeaderProps,
	ScrollViewWithHeaders,
} from '@codeherence/react-native-header'
import { View } from 'react-native'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import {
	AppLanguage,
	AppTheme,
	DefaultServer,
	MaskURLs,
	ReaderSettingsLink,
} from '~/components/appSettings/preferences'
import { StumpEnabled } from '~/components/appSettings/stump'
import { Heading } from '~/components/ui'
import { Text } from '~/components/ui/text'

export default function Screen() {
	const HeaderComponent = ({ showNavBar }: ScrollHeaderProps) => {
		return (
			<Header
				showNavBar={showNavBar}
				noBottomBorder
				headerLeftFadesIn
				headerLeftStyle={{ flex: 1 }}
				headerLeft={
					<Text size="lg" className="uppercase text-foreground-muted">
						Settings
					</Text>
				}
			/>
		)
	}

	const LargeHeaderComponent = ({ scrollY }: ScrollLargeHeaderProps) => {
		return (
			<LargeHeader>
				<ScalingView
					scrollY={scrollY}
					className="-mt-2 flex-1 flex-row items-center justify-between"
				>
					<Heading size="xl">Settings</Heading>
				</ScalingView>
			</LargeHeader>
		)
	}

	return (
		<ScrollViewWithHeaders
			className="flex-1 bg-background"
			disableAutoFixScroll
			HeaderComponent={HeaderComponent}
			LargeHeaderComponent={LargeHeaderComponent}
		>
			<View className="flex-1 gap-8 bg-background p-6">
				<View>
					<Text className="mb-3 text-foreground-muted">Preferences</Text>
					<AppTheme />
					<AppLanguage />
					<DefaultServer />
					<MaskURLs />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Reading</Text>

					<ReaderSettingsLink />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Stump</Text>

					<View className="mb-2 rounded-xl bg-fill-info-secondary p-2">
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

				<ContactInformation />

				<SupportInformation />
			</View>
		</ScrollViewWithHeaders>
	)
}
