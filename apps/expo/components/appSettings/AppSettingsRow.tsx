import { View } from 'react-native'

import { icons } from '~/components/ui'

import { Text } from '../ui'

type Props = {
	icon: keyof typeof icons
	title: string
	onPress?: () => void
	children?: React.ReactNode
}

// TODO: break up into a few variants, e.g. an internal link to another screen vs a
// link to website vs action etc

export default function AppSettingsRow({ icon, title, children }: Props) {
	const Icon = icons[icon]
	return (
		<View className="flex-row items-center justify-between py-2">
			<View className="flex-row items-center gap-4">
				<View className="rounded-xl bg-background-surface p-1">
					<Icon className="text-foreground-muted" size={20} />
				</View>
				<Text className="text-lg">{title}</Text>
			</View>
			{children}
		</View>
	)
}
