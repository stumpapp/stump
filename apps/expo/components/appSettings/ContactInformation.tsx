import { ArrowUpRight, Github, Mail } from 'lucide-react-native'
import { Linking, View } from 'react-native'

import { Icon, icons, Text } from '../ui'
import AppSettingsRow from './AppSettingsRow'

const { Discord } = icons

export default function ContactInformation() {
	return (
		<View>
			<Text className="mb-3 text-foreground-muted">Contact</Text>

			<AppSettingsRow
				icon={Mail}
				title="Email"
				onPress={() => Linking.openURL('mailto:aaronleopold1221@gmail.com')}
				isLink
			>
				<Icon as={ArrowUpRight} size={20} className="text-foreground-muted" />
			</AppSettingsRow>

			<AppSettingsRow
				// @ts-expect-error: It's fine
				icon={Discord}
				title="Discord"
				isLink
				onPress={() => Linking.openURL('https://discord.gg/63Ybb7J3as')}
			>
				<ArrowUpRight size={20} className="text-foreground-muted" />
			</AppSettingsRow>

			<AppSettingsRow
				icon={Github}
				title="GitHub"
				isLink
				onPress={() => Linking.openURL('https://github.com/stumpapp/stump/issues/new/choose')}
			>
				<ArrowUpRight size={20} className="text-foreground-muted" />
			</AppSettingsRow>
		</View>
	)
}
