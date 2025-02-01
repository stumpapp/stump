import { View, Linking, Pressable } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { icons, Text } from '../ui'
import AppSettingsRow from './AppSettingsRow'
import { cn } from '~/lib/utils'

const { ArrowUpRight, GitHub } = icons

export default function ContactInformation() {
	return (
		<View>
			<Text className="mb-3 text-foreground-muted">Contact</Text>

			<Pressable onPress={() => Linking.openURL('mailto:aaronleopold1221@gmail.com')}>
				{({ pressed }) => (
					<AppSettingsRow icon="Mail" title="Email" className={cn(pressed && 'opacity-70')}>
						<ArrowUpRight size={20} className="text-foreground-muted" />
					</AppSettingsRow>
				)}
			</Pressable>

			<Pressable onPress={() => Linking.openURL('https://discord.gg/63Ybb7J3as')}>
				{({ pressed }) => (
					<AppSettingsRow icon="Discord" title="Discord" className={cn(pressed && 'opacity-70')}>
						<ArrowUpRight size={20} className="text-foreground-muted" />
					</AppSettingsRow>
				)}
			</Pressable>

			<Pressable
				onPress={() => Linking.openURL('https://github.com/stumpapp/stump/issues/new/choose')}
			>
				{({ pressed }) => (
					<AppSettingsRow icon="GitHub" title="GitHub" className={cn(pressed && 'opacity-70')}>
						<ArrowUpRight size={20} className="text-foreground-muted" />
					</AppSettingsRow>
				)}
			</Pressable>
		</View>
	)
}
