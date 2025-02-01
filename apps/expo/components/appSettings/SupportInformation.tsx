import { View } from 'react-native'

import { Text } from '../ui'

export default function SupportInformation() {
	return (
		<View>
			<Text className="mb-3 text-foreground-muted">Build Information</Text>

			<Text className="text-foreground-muted">Version: 0.0.0</Text>
			<Text className="text-foreground-muted">
				Support Identifier: 00000000-0000-0000-0000-000000000000
			</Text>
		</View>
	)
}
