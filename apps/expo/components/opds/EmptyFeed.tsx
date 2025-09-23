import { View } from 'react-native'

import { icons } from '~/lib'

import { Text } from '../ui'

const { Rss, Slash } = icons

type Props = {
	message: string
}
export default function EmptyFeed({ message }: Props) {
	return (
		<View className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
			<View className="relative flex justify-center">
				<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
					<Rss className="h-6 w-6 text-foreground-muted" />
					<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
				</View>
			</View>

			<Text>{message}</Text>
		</View>
	)
}
