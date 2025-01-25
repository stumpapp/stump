import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import { AppLanguage, AppTheme, DefaultServer } from '~/components/appSettings/preferences'
import { Text } from '~/components/ui/text'

export default function Screen() {
	return (
		<ScrollView className="flex-1 bg-background">
			<View className="flex-1 gap-8 bg-background p-6">
				<View>
					<Text className="mb-3 text-foreground-muted">Preferences</Text>
					<AppTheme />
					<AppLanguage />
					<DefaultServer />
				</View>

				<View>
					<Text className="mb-3 text-foreground-muted">Management</Text>
					<AppDataUsageLink />
				</View>

				<ContactInformation />

				<SupportInformation />
			</View>
		</ScrollView>
	)
}
