import { View } from 'react-native'

import { icons, Text } from '../ui'
import AppSettingsRow from './AppSettingsRow'

const { ArrowUpRight } = icons

export default function ContactInformation() {
	return (
		<View>
			<Text className="mb-3 text-foreground-muted">Contact</Text>

			<AppSettingsRow icon="Mail" title="Email">
				<ArrowUpRight size={20} className="text-foreground-muted" />
			</AppSettingsRow>

			{/* TODO: social icon */}
			<AppSettingsRow icon="Box" title="Discord">
				<ArrowUpRight size={20} className="text-foreground-muted" />
			</AppSettingsRow>
		</View>
	)
}
