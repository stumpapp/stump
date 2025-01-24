import { View } from 'react-native'

import { ContactInformation, SupportInformation } from '~/components/appSettings'
import { AppDataUsageLink } from '~/components/appSettings/management'
import { AppLanguage, AppTheme, DefaultServer } from '~/components/appSettings/preferences'
import { Text } from '~/components/ui/text'

export default function Screen() {
	return (
		<View className="flex-1 gap-8 bg-background p-4">
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
	)
}
